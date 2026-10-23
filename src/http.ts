import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "request body must be valid JSON" });
  }
}
