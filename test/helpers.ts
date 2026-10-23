import { afterAll } from "vitest";
import { app } from "../src/app";
import { pool } from "../src/db";

afterAll(() => pool.end());

export const API_KEY = process.env.API_KEY ?? "";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export function api(path: string, { method = "GET", body, headers }: RequestOptions = {}) {
  return app.request(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const HOUR = 60 * 60 * 1000;

/** A 30-minute slot starting `hoursFromNow` hours from now (negative for the past). */
export function slot(id: string, hoursFromNow = 24, provider = "Dr Ade") {
  const start = new Date(Date.now() + hoursFromNow * HOUR);
  start.setUTCMilliseconds(0);
  const end = new Date(start.getTime() + HOUR / 2);
  return {
    id,
    provider,
    start: start.toISOString().replace(".000Z", "Z"),
    end: end.toISOString().replace(".000Z", "Z"),
  };
}

export async function reset(slots = [slot("s1"), slot("s2", 48), slot("s3", 72, "Dr Bello")]) {
  const res = await api("/reset", { method: "POST", body: { slots } });
  if (res.status !== 200) throw new Error(`reset failed: ${res.status}`);
  return slots;
}

export function book(body: Record<string, unknown>, headers?: Record<string, string>) {
  return api("/bookings", { method: "POST", body, headers });
}
