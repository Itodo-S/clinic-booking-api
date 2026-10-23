import { createHash } from "node:crypto";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type pg from "pg";

export interface Outcome {
  status: ContentfulStatusCode;
  body: object;
  headers?: Record<string, string>;
}

/** Recursively sorts object keys so that key order doesn't change the request hash. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => [k, canonical(v)]),
    );
  }
  return value;
}

/**
 * Runs `run` at most once per key (keys live for 24 hours). A retry with the same body replays
 * the stored response; the same key with a different body is rejected with 422.
 * Must be called inside a transaction.
 */
export async function idempotent(
  db: pg.PoolClient,
  key: string,
  body: unknown,
  run: () => Promise<Outcome>,
): Promise<Outcome> {
  const hash = createHash("sha256")
    .update(JSON.stringify(canonical(body)))
    .digest("hex");

  // Requests sharing a key queue here until the first one commits, so it is only ever run once.
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`idempotency:${key}`]);
  const { rows } = await db.query<{ request_hash: string; status_code: number; response: object }>(
    `SELECT request_hash, status_code, response FROM idempotency_keys
     WHERE key = $1 AND created_at > now() - interval '24 hours'`,
    [key],
  );

  const stored = rows[0];
  if (stored && stored.request_hash !== hash) {
    return {
      status: 422,
      body: { error: "Idempotency-Key was already used with a different request body" },
    };
  }
  if (stored) {
    return {
      status: stored.status_code as ContentfulStatusCode,
      body: stored.response,
      headers: { "Idempotent-Replayed": "true" },
    };
  }

  const outcome = await run();
  // A rate-limited request never ran, so the client may retry it with the same key later.
  if (outcome.status === 429) return outcome;
  await db.query(
    `INSERT INTO idempotency_keys (key, request_hash, status_code, response)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET request_hash = $2, status_code = $3, response = $4,
                                     created_at = now()`,
    [key, hash, outcome.status, outcome.body],
  );
  return outcome;
}
