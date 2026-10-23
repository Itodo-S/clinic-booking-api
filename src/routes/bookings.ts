import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { BOOKING_COLUMNS, type BookingRow, toBooking } from "../bookings";
import { pool } from "../db";
import { readJson } from "../http";

export const bookings = new Hono()
  .post("/", async (c) => {
    const { slot_id, name, email } = (await readJson(c)) as Record<string, string>;
    const slot = await pool.query("SELECT 1 FROM slots WHERE id = $1", [slot_id]);
    if (slot.rowCount === 0) throw new HTTPException(404, { message: "slot not found" });

    const { rows } = await pool.query<BookingRow>(
      `INSERT INTO bookings (slot_id, name, email) VALUES ($1, $2, $3) RETURNING ${BOOKING_COLUMNS}`,
      [slot_id, name, email],
    );
    return c.json(toBooking(rows[0] as BookingRow), 201);
  })

  .get("/:id", async (c) => {
    const { rows } = await pool.query<BookingRow>(
      `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`,
      [c.req.param("id")],
    );
    if (!rows[0]) throw new HTTPException(404, { message: "booking not found" });
    return c.json(toBooking(rows[0]));
  });
