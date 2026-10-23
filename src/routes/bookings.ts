import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { BOOKING_COLUMNS, type BookingRow, parseNewBooking, toBooking } from "../bookings";
import { pool } from "../db";
import { readJson } from "../http";

export const bookings = new Hono()
  .post("/", async (c) => {
    const { slot_id, name, email } = parseNewBooking(await readJson(c));

    const slot = await pool.query<{ started: boolean }>(
      "SELECT starts_at <= now() AS started FROM slots WHERE id = $1",
      [slot_id],
    );
    if (!slot.rows[0]) throw new HTTPException(404, { message: "slot not found" });
    if (slot.rows[0].started) throw new HTTPException(400, { message: "slot has already started" });

    // The partial unique index allows one confirmed booking per slot. A racing insert waits
    // for the other transaction, then skips the row, so exactly one request wins.
    const { rows } = await pool.query<BookingRow>(
      `INSERT INTO bookings (slot_id, name, email) VALUES ($1, $2, $3)
       ON CONFLICT (slot_id) WHERE status = 'confirmed' DO NOTHING
       RETURNING ${BOOKING_COLUMNS}`,
      [slot_id, name, email],
    );
    if (!rows[0]) throw new HTTPException(409, { message: "slot is already booked" });
    return c.json(toBooking(rows[0]), 201);
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
