import type pg from "pg";

const MAX_ATTEMPTS = 5;

/**
 * Sliding-window limit: at most 5 booking attempts per email in any 60 seconds.
 * Records the attempt and returns null when allowed; otherwise returns the whole number of
 * seconds until the oldest attempt leaves the window. Must be called inside a transaction.
 */
export async function takeAttempt(db: pg.PoolClient, email: string): Promise<number | null> {
  // Attempts for the same email queue here, so a burst can't slip past the count.
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`rate-limit:${email}`]);

  const { rows } = await db.query<{ attempts: number; retry_after: string | null }>(
    `WITH expired AS (
       DELETE FROM booking_attempts
       WHERE email = $1 AND attempted_at <= clock_timestamp() - interval '1 minute'
     )
     SELECT count(*)::int AS attempts,
            extract(epoch FROM min(attempted_at) + interval '1 minute' - clock_timestamp())
              AS retry_after
     FROM booking_attempts
     WHERE email = $1 AND attempted_at > clock_timestamp() - interval '1 minute'`,
    [email],
  );
  const { attempts = 0, retry_after = null } = rows[0] ?? {};
  if (attempts >= MAX_ATTEMPTS) return Math.max(1, Math.ceil(Number(retry_after)));

  await db.query("INSERT INTO booking_attempts (email) VALUES ($1)", [email]);
  return null;
}
