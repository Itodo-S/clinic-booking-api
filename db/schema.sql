-- Safe to run repeatedly: every statement is idempotent.

CREATE TABLE IF NOT EXISTS slots (
  id        text PRIMARY KEY,
  provider  text NOT NULL,
  -- start/end are kept exactly as received so responses echo them unchanged;
  -- starts_at is the parsed instant used for ordering and "already started" checks.
  start     text NOT NULL,
  "end"     text NOT NULL,
  starts_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS slots_starts_at_idx ON slots (starts_at);

CREATE TABLE IF NOT EXISTS bookings (
  seq        bigserial UNIQUE,
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slot_id    text NOT NULL REFERENCES slots (id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text NOT NULL,
  status     text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The double-booking guarantee: at most one confirmed booking per slot,
-- enforced by Postgres no matter how many requests race.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_confirmed_per_slot
  ON bookings (slot_id) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS bookings_email_seq_idx ON bookings (email, seq);
