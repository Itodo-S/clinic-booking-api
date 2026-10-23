import { beforeEach, describe, expect, it } from "vitest";
import { api, book, reset } from "./helpers";

const person = (n: number) => ({ slot_id: "s1", name: `Patient ${n}`, email: `p${n}@example.com` });

describe("level 3: no double booking", () => {
  beforeEach(() => reset());

  it("returns 409 when the slot already has a confirmed booking", async () => {
    expect((await book(person(1))).status).toBe(201);
    const res = await book(person(2));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "slot is already booked" });
  });

  it("lets exactly one of many simultaneous requests book the slot", async () => {
    const responses = await Promise.all(Array.from({ length: 25 }, (_, i) => book(person(i))));
    const statuses = responses.map((res) => res.status).sort();

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(24);
  });
});

describe("level 3: cancellation", () => {
  beforeEach(() => reset());

  it("cancels a booking and frees the slot", async () => {
    const created = await (await book(person(1))).json();

    const res = await api(`/bookings/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ...created, status: "cancelled" });

    const slots = (await (await api("/slots")).json()).slots;
    expect(slots.find((s: { id: string }) => s.id === "s1").available).toBe(true);
    expect((await book(person(2))).status).toBe(201);
  });

  it("returns 409 when the booking is already cancelled", async () => {
    const { id } = await (await book(person(1))).json();
    const [first, second] = await Promise.all([
      api(`/bookings/${id}`, { method: "DELETE" }),
      api(`/bookings/${id}`, { method: "DELETE" }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const again = await api(`/bookings/${id}`, { method: "DELETE" });
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: "booking is already cancelled" });
  });

  it("returns 404 when cancelling an unknown booking", async () => {
    const res = await api("/bookings/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
