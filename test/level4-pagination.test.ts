import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { api, reset, slot } from "./helpers";

interface Page {
  bookings: { id: string; email: string; slot_id: string }[];
  next_cursor: string | null;
}

/** Inserts bookings directly so the per-email rate limit doesn't get in the way of seeding. */
async function seed(email: string, count: number) {
  const slots = Array.from({ length: count }, (_, i) => slot(`${email}-${i}`, i + 1));
  await reset(slots);
  for (const { id } of slots) {
    await pool.query("INSERT INTO bookings (slot_id, name, email) VALUES ($1, 'Ada', $2)", [
      id,
      email,
    ]);
  }
  return slots.map((s) => s.id);
}

async function page(query: string) {
  const res = await api(`/bookings?${query}`);
  return { status: res.status, body: (await res.json()) as Page };
}

describe("level 4: a person's bookings", () => {
  let slotIds: string[];
  beforeEach(async () => {
    slotIds = await seed("ada@example.com", 12);
  });

  it("pages through every booking, oldest first, until next_cursor is null", async () => {
    const seen: string[] = [];
    const sizes: number[] = [];
    let cursor: string | null = "";
    while (cursor !== null) {
      const q: string = `email=ada@example.com&limit=5${cursor ? `&cursor=${cursor}` : ""}`;
      const { status, body } = await page(q);
      expect(status).toBe(200);
      seen.push(...body.bookings.map((b) => b.slot_id));
      sizes.push(body.bookings.length);
      cursor = body.next_cursor;
    }
    expect(sizes).toEqual([5, 5, 2]);
    expect(seen).toEqual(slotIds);
  });

  it("defaults to 10 per page", async () => {
    const { body } = await page("email=ada@example.com");
    expect(body.bookings).toHaveLength(10);
    expect(body.next_cursor).toEqual(expect.any(String));
  });

  it("matches the email ignoring case and only returns that person's bookings", async () => {
    await pool.query(
      "INSERT INTO bookings (slot_id, name, email, status) VALUES ($1, 'Bo', $2, 'cancelled')",
      [slotIds[0], "bo@example.com"],
    );
    const { body } = await page("email=ADA@Example.com&limit=50");
    expect(body.bookings).toHaveLength(12);
    expect(body.bookings.every((b) => b.email === "ada@example.com")).toBe(true);
    expect(body.next_cursor).toBeNull();
  });

  it("returns an empty page for someone with no bookings", async () => {
    const { status, body } = await page("email=nobody@example.com");
    expect(status).toBe(200);
    expect(body).toEqual({ bookings: [], next_cursor: null });
  });

  it.each(["0", "51", "-1", "1.5", "abc", ""])("returns 400 for limit=%s", async (limit) => {
    const { status } = await page(`email=ada@example.com&limit=${limit}`);
    expect(status).toBe(400);
  });

  it("returns 400 without an email or with a bad cursor", async () => {
    expect((await page("limit=5")).status).toBe(400);
    expect((await page("email=ada@example.com&cursor=!!")).status).toBe(400);
  });
});
