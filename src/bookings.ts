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
