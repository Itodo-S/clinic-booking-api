import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { book, reset } from "./helpers";

const ada = { slot_id: "s1", name: "Ada Obi", email: "ada@example.com" };
const key = (k: string) => ({ "Idempotency-Key": k });

async function bookingCount() {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM bookings");
  return rows[0].n as number;
}

describe("level 4: idempotent booking", () => {
  beforeEach(() => reset());

  it("returns the same response for a retried request and books only once", async () => {
    const first = await book(ada, key("retry-1"));
    const second = await book(ada, key("retry-1"));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(await first.json());
    expect(second.headers.get("Idempotent-Replayed")).toBe("true");
    expect(await bookingCount()).toBe(1);
  });

  it("treats a body with reordered keys as the same request", async () => {
    const first = await (await book(ada, key("order"))).json();
    const reordered = { email: ada.email, name: ada.name, slot_id: ada.slot_id };
    const second = await book(reordered, key("order"));
    expect(second.status).toBe(201);
    expect((await second.json()).id).toBe(first.id);
  });

  it("books only once when the same request arrives many times at once", async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => book(ada, key("burst"))));
    const bodies = await Promise.all(responses.map((res) => res.json()));

    expect(responses.every((res) => res.status === 201)).toBe(true);
    expect(new Set(bodies.map((body) => body.id)).size).toBe(1);
    expect(await bookingCount()).toBe(1);
  });

  it("returns 422 when the key is reused with a different body", async () => {
    await book(ada, key("reused"));
    const res = await book({ ...ada, slot_id: "s2" }, key("reused"));
    expect(res.status).toBe(422);
    expect(await res.json()).toHaveProperty("error");
    expect(await bookingCount()).toBe(1);
  });

  it("replays failed responses with the same status", async () => {
    const first = await book({ ...ada, slot_id: "missing" }, key("failed"));
    const second = await book({ ...ada, slot_id: "missing" }, key("failed"));
    expect(first.status).toBe(404);
    expect(second.status).toBe(404);
  });

  it("does not affect requests with different keys", async () => {
    expect((await book(ada, key("a"))).status).toBe(201);
    expect((await book(ada, key("b"))).status).toBe(409);
  });

  it("forgets keys on reset", async () => {
    const first = await (await book(ada, key("after-reset"))).json();
    await reset();
    const res = await book(ada, key("after-reset"));
    expect(res.status).toBe(201);
    expect((await res.json()).id).not.toBe(first.id);
  });
});
