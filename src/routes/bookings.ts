import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  BOOKING_COLUMNS,
  type BookingRow,
  createBooking,
  parseNewBooking,
  toBooking,
} from "../bookings";
import { type Db, pool, withTransaction } from "../db";
import { readJson } from "../http";
import { idempotent, type Outcome } from "../idempotency";

/** Runs one booking attempt, turning expected failures into responses so they can be replayed. */
async function attemptBooking(db: Db, body: unknown): Promise<Outcome> {
  try {
    return { status: 201, body: await createBooking(db, parseNewBooking(body)) };
  } catch (error) {
    if (error instanceof HTTPException) {
      return { status: error.status, body: { error: error.message } };
    }
    throw error;
  }
}

const encodeCursor = (seq: string) => Buffer.from(seq).toString("base64url");

function decodeCursor(cursor: string) {
  const seq = Buffer.from(cursor, "base64url").toString();
  if (!/^\d{1,18}$/.test(seq)) throw new HTTPException(400, { message: "cursor is invalid" });
  return seq;
}

export const bookings = new Hono()
  .get("/", async (c) => {
    const email = c.req.query("email")?.trim().toLowerCase();
    if (!email) throw new HTTPException(400, { message: "email is required" });

    const limitParam = c.req.query("limit") ?? "10";
    const limit = Number(limitParam);
    if (!/^\d+$/.test(limitParam) || limit < 1 || limit > 50) {
      throw new HTTPException(400, { message: "limit must be an integer from 1 to 50" });
    }
    const cursor = c.req.query("cursor");
    const after = cursor ? decodeCursor(cursor) : "0";

    // Keyset pagination on the insert sequence: fetch one extra row to know if there's a next page.
    const { rows } = await pool.query<BookingRow & { seq: string }>(
      `SELECT seq, ${BOOKING_COLUMNS} FROM bookings
       WHERE email = $1 AND seq > $2
       ORDER BY seq
       LIMIT $3`,
      [email, after, limit + 1],
    );
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return c.json({
      bookings: page.map(({ seq: _, ...row }) => toBooking(row)),
      next_cursor: rows.length > limit && last ? encodeCursor(last.seq) : null,
    });
  })

  .post("/", async (c) => {
    const body = await readJson(c);
    const key = c.req.header("Idempotency-Key");
    if (key && key.length > 255) {
      throw new HTTPException(400, { message: "Idempotency-Key must be at most 255 characters" });
    }

    const outcome = await withTransaction((db) => {
      const attempt = () => attemptBooking(db, body);
      return key ? idempotent(db, key, body, attempt) : attempt();
    });
    return c.json(outcome.body, outcome.status, outcome.headers);
  })

  .get("/:id", async (c) => {
    const { rows } = await pool.query<BookingRow>(
      `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`,
      [c.req.param("id")],
    );
    if (!rows[0]) throw new HTTPException(404, { message: "booking not found" });
    return c.json(toBooking(rows[0]));
  })

  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const { rows } = await pool.query<BookingRow>(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1 AND status = 'confirmed'
       RETURNING ${BOOKING_COLUMNS}`,
      [id],
    );
    if (rows[0]) return c.json(toBooking(rows[0]));

    const existing = await pool.query("SELECT 1 FROM bookings WHERE id = $1", [id]);
    if (existing.rowCount === 0) throw new HTTPException(404, { message: "booking not found" });
    throw new HTTPException(409, { message: "booking is already cancelled" });
  });
