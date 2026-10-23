import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { pool, withTransaction } from "../db";
import { readJson } from "../http";

const timestamp = (field: string) =>
  z
    .string({ error: `${field} is required` })
    .refine((value) => !Number.isNaN(Date.parse(value)), `${field} must be a date-time`);

const resetBody = z.object(
  {
    slots: z.array(
      z.object({
        id: z.string({ error: "slot id is required" }).min(1, "slot id is required"),
        provider: z.string({ error: "provider is required" }).min(1, "provider is required"),
        start: timestamp("start"),
        end: timestamp("end"),
      }),
      { error: "slots must be an array" },
    ),
  },
  { error: "request body must be a JSON object" },
);

export const slots = new Hono()
  .post("/reset", async (c) => {
    const parsed = resetBody.safeParse(await readJson(c));
    if (!parsed.success) {
      throw new HTTPException(400, { message: parsed.error.issues[0]?.message });
    }
    const list = parsed.data.slots;
    if (new Set(list.map((slot) => slot.id)).size !== list.length) {
      throw new HTTPException(400, { message: "slot ids must be unique" });
    }

    await withTransaction(async (db) => {
      await db.query("TRUNCATE bookings, slots");
      await db.query(
        `INSERT INTO slots (id, provider, start, "end", starts_at)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::timestamptz[])`,
        [
          list.map((slot) => slot.id),
          list.map((slot) => slot.provider),
          list.map((slot) => slot.start),
          list.map((slot) => slot.end),
          list.map((slot) => new Date(slot.start).toISOString()),
        ],
      );
    });
    return c.json({ message: "reset complete", slots: list.length });
  })

  .get("/slots", async (c) => {
    const { rows } = await pool.query(
      `SELECT s.id, s.provider, s.start, s."end",
              NOT EXISTS (
                SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status = 'confirmed'
              ) AS available
       FROM slots s
       WHERE $1::text IS NULL OR s.provider = $1
       ORDER BY s.starts_at, s.id`,
      [c.req.query("provider") ?? null],
    );
    return c.json({ slots: rows });
  });
