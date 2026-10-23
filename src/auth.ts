import { createHash, timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Rejects requests whose X-API-Key header doesn't match API_KEY, using a constant-time compare. */
export const requireApiKey = createMiddleware(async (c, next) => {
  const expected = process.env.API_KEY;
  const given = c.req.header("X-API-Key");
  if (!expected || !given || !timingSafeEqual(digest(given), digest(expected))) {
    throw new HTTPException(401, { message: "missing or invalid API key" });
  }
  await next();
});
