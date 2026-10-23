import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bookings } from "./routes/bookings";
import { slots } from "./routes/slots";

const api = new Hono().route("/", slots).route("/bookings", bookings);

export const app = new Hono()
  .route("/api", api)
  .notFound((c) => c.json({ error: "not found" }, 404))
  .onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "internal server error" }, 500);
  });
