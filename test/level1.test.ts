import { beforeEach, describe, expect, it } from "vitest";
import { api, book, reset, slot } from "./helpers";

const ada = { slot_id: "s1", name: "Ada Obi", email: "ada@example.com" };

describe("level 1: slots and bookings", () => {
  beforeEach(() => reset());

  it("lists every slot earliest first, echoing times exactly", async () => {
    const slots = await reset([slot("late", 72), slot("early", 1), slot("mid", 24, "Dr Bello")]);
    const res = await api("/slots");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots.map((s: { id: string }) => s.id)).toEqual(["early", "mid", "late"]);
    expect(body.slots[0]).toEqual({ ...slots[1], available: true });
  });

  it("filters slots by exact provider", async () => {
    const res = await api(`/slots?provider=${encodeURIComponent("Dr Bello")}`);
    const body = await res.json();
    expect(body.slots.map((s: { id: string }) => s.id)).toEqual(["s3"]);
  });

  it("books a slot and marks it unavailable", async () => {
    const res = await book(ada);
    expect(res.status).toBe(201);
    const booking = await res.json();
    expect(booking).toMatchObject({ ...ada, status: "confirmed" });
    expect(booking.id).toEqual(expect.any(String));
    expect(Date.parse(booking.created_at)).not.toBeNaN();

    const slots = (await (await api("/slots")).json()).slots;
    expect(slots.find((s: { id: string }) => s.id === "s1").available).toBe(false);
  });

  it("looks up a booking by id", async () => {
    const created = await (await book(ada)).json();
    const res = await api(`/bookings/${created.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
  });

  it("returns 404 for an unknown booking", async () => {
    const res = await api("/bookings/does-not-exist");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "booking not found" });
  });

  it("reset replaces all slots and deletes every booking, past slots included", async () => {
    const created = await (await book(ada)).json();
    await reset([slot("old", -24)]);

    expect((await api(`/bookings/${created.id}`)).status).toBe(404);
    const slots = (await (await api("/slots")).json()).slots;
    expect(slots.map((s: { id: string }) => s.id)).toEqual(["old"]);
  });

  it("rejects an invalid reset body", async () => {
    const res = await api("/reset", { method: "POST", body: { slots: [{ id: "x" }] } });
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error");
  });
});
