import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireApiKey } from "./auth.js";
import { bookings } from "./routes/bookings.js";
import { slots } from "./routes/slots.js";
import { webProxy } from "./web-proxy.js";

const api = new Hono().use(requireApiKey).route("/", slots).route("/bookings", bookings);

export const app: Hono = new Hono()
  .route("/api", api)
  .route(
    "/web-api",
    webProxy((request) => app.fetch(request)),
  )
  .notFound((c) => c.json({ error: "not found" }, 404))
  .onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "internal server error" }, 500);
  });
