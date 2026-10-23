import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { book, reset, slot } from "./helpers";

const slots = Array.from({ length: 12 }, (_, i) => slot(`s${i}`, i + 1));
const attempt = (email: string, slotId = "missing", headers?: Record<string, string>) =>
  book({ slot_id: slotId, name: "Ada Obi", email }, headers);

/** Moves every recorded attempt back in time, as if `seconds` had passed. */
const travel = (seconds: number) =>
  pool.query(`UPDATE booking_attempts SET attempted_at = attempted_at - $1 * interval '1 second'`, [
    seconds,
  ]);

describe("level 5: rate limiting", () => {
  beforeEach(() => reset(slots));

  it("allows 5 attempts per email per minute and returns 429 with Retry-After on the 6th", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await attempt("ada@example.com", `s${i}`)).status).toBe(201);
    }
    const res = await attempt("ada@example.com", "s5");

    expect(res.status).toBe(429);
    expect(await res.json()).toHaveProperty("error");
    const retryAfter = res.headers.get("Retry-After") ?? "";
    expect(retryAfter).toMatch(/^\d+$/);
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
    expect(Number(retryAfter)).toBeLessThanOrEqual(60);
  });

  it("counts failed attempts too", async () => {
    for (let i = 0; i < 5; i++) expect((await attempt("ada@example.com")).status).toBe(404);
    expect((await attempt("ada@example.com", "s0")).status).toBe(429);
  });

  it("counts the email after trimming and lower-casing it", async () => {
    for (let i = 0; i < 5; i++) await attempt(i % 2 ? " ADA@example.com " : "ada@Example.com");
    expect((await attempt("ada@example.com")).status).toBe(429);
  });

  it("doesn't affect other emails", async () => {
    for (let i = 0; i < 6; i++) await attempt("ada@example.com");
    expect((await attempt("bo@example.com", "s0")).status).toBe(201);
  });

  it("holds under a simultaneous burst", async () => {
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) => attempt("ada@example.com", `s${i}`)),
    );
    const statuses = responses.map((res) => res.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(7);
  });

  it("allows attempts again once the oldest leaves the one-minute window", async () => {
    for (let i = 0; i < 5; i++) await attempt("ada@example.com");
    await travel(45);
    const limited = await attempt("ada@example.com");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeLessThanOrEqual(15);

    await travel(16);
    expect((await attempt("ada@example.com", "s0")).status).toBe(201);
  });

  it("doesn't store a 429 against an Idempotency-Key, so the retry can succeed later", async () => {
    for (let i = 0; i < 5; i++) await attempt("ada@example.com");
    const key = { "Idempotency-Key": "after-limit" };
    expect((await attempt("ada@example.com", "s0", key)).status).toBe(429);

    await travel(61);
    expect((await attempt("ada@example.com", "s0", key)).status).toBe(201);
  });
});
