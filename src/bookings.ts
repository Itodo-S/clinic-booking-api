import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export interface BookingRow {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  created_at: Date;
}

export const BOOKING_COLUMNS = "id, slot_id, name, email, status, created_at";

export function toBooking(row: BookingRow) {
  return { ...row, created_at: row.created_at.toISOString() };
}

const requiredString = (field: string) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined || issue.input === null
          ? `${field} is required`
          : `${field} must be a string`,
    })
    .trim()
    .min(1, `${field} is required`);

const newBooking = z.object(
  {
    slot_id: requiredString("slot_id"),
    name: requiredString("name").max(200, "name must be at most 200 characters"),
    email: requiredString("email")
      .max(254, "email is invalid")
      .toLowerCase()
      .pipe(z.email("email is invalid")),
  },
  { error: "request body must be a JSON object" },
);

export type NewBooking = z.infer<typeof newBooking>;

/** Validates a booking request; trims name and email and lower-cases the email. */
export function parseNewBooking(body: unknown): NewBooking {
  const parsed = newBooking.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message });
  return parsed.data;
}
