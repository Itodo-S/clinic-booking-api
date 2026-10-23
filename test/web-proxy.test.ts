import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { reset } from "./helpers";

const web = (path: string, init: RequestInit = {}) =>
  app.request(`/web-api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

describe("web page proxy", () => {
  beforeEach(() => reset());

  it("forwards to the API with the server's key, so the browser needs none", async () => {
    const res = await web("/slots");
    expect(res.status).toBe(200);
    expect((await res.json()).slots).toHaveLength(3);
  });

  it("forwards request bodies and headers", async () => {
    const body = JSON.stringify({ slot_id: "s1", name: "Ada", email: "ada@example.com" });
    const headers = { "Idempotency-Key": "web-1" };
    const first = await web("/bookings", { method: "POST", body, headers });
    const second = await web("/bookings", { method: "POST", body, headers });

    expect(first.status).toBe(201);
    expect(second.headers.get("Idempotent-Replayed")).toBe("true");
    const { id } = await first.json();
    expect((await web(`/bookings/${id}`, { method: "DELETE" })).status).toBe(200);
  });

  it("does not expose reset", async () => {
    const res = await web("/reset", { method: "POST", body: JSON.stringify({ slots: [] }) });
    expect(res.status).toBe(404);
  });
});
