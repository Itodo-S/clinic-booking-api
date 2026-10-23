import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { api, book, reset, slot } from "./helpers";

const valid = { slot_id: "s1", name: "Ada Obi", email: "ada@example.com" };

describe("level 2: API key", () => {
  it.each([
    ["GET", "/api/slots"],
    ["POST", "/api/reset"],
    ["POST", "/api/bookings"],
    ["GET", "/api/bookings/anything"],
  ])("rejects %s %s without a key", async (method, path) => {
    const res = await app.request(path, { method });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "missing or invalid API key" });
  });

  it("rejects a wrong key", async () => {
    const res = await api("/slots", { headers: { "X-API-Key": "wrong" } });
    expect(res.status).toBe(401);
  });
});

describe("level 2: booking validation", () => {
  beforeEach(() => reset([slot("s1"), slot("past", -2), slot("now", -0.1)]));

  it.each([
    ["missing slot_id", { name: "Ada", email: "ada@example.com" }],
    ["missing name", { slot_id: "s1", email: "ada@example.com" }],
    ["missing email", { slot_id: "s1", name: "Ada" }],
    ["empty slot_id", { ...valid, slot_id: "" }],
    ["blank name", { ...valid, name: "   " }],
    ["empty email", { ...valid, email: "" }],
    ["null name", { ...valid, name: null }],
    ["non-string slot_id", { ...valid, slot_id: 1 }],
    ["invalid email", { ...valid, email: "not-an-email" }],
    ["email without domain", { ...valid, email: "ada@" }],
    ["email with spaces", { ...valid, email: "ada obi@example.com" }],
  ])("returns 400 for %s", async (_, body) => {
    const res = await book(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it("returns 400 for a body that isn't a JSON object", async () => {
    expect((await api("/bookings", { method: "POST", body: [valid] })).status).toBe(400);
    const malformed = await app.request("/api/bookings", {
      method: "POST",
      headers: { "X-API-Key": process.env.API_KEY ?? "", "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(malformed.status).toBe(400);
  });

  it("returns 404 for a slot that doesn't exist", async () => {
    const res = await book({ ...valid, slot_id: "nope" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "slot not found" });
  });

  it.each(["past", "now"])("returns 400 for a slot that has already started (%s)", async (id) => {
    const res = await book({ ...valid, slot_id: id });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "slot has already started" });
  });

  it("trims name and email and stores the email in lower case", async () => {
    const res = await book({ slot_id: "s1", name: "  Ada Obi ", email: "  Ada@Example.COM " });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "Ada Obi", email: "ada@example.com" });
  });
});
