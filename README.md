# Clinic booking API

An API that lets patients book clinic appointment slots, plus a web page that uses it. Built in TypeScript with Hono and Postgres, and deployed on Vercel with Neon.

| | |
|---|---|
| **Web page** | https://clinic-booking-api.vercel.app |
| **API base URL** | https://clinic-booking-api.vercel.app/api |
| **Spec** | [koyaacademy.com/assessment-api](https://koyaacademy.com/assessment-api) |

All five levels are implemented, and each one has its own commit with tests.

| Level | What it does | Where |
|---|---|---|
| 1 | Reset slots, list slots, book a slot, look up a booking | `src/routes/slots.ts`, `src/routes/bookings.ts` |
| 2 | `X-API-Key` auth (401). Booking validation: 400 for bad input, 404 for an unknown slot, 400 for a slot that has already started | `src/auth.ts`, `src/bookings.ts` |
| 3 | No double booking, even under simultaneous requests (409). Cancellation | `db/schema.sql`, `src/bookings.ts` |
| 4 | `Idempotency-Key` retries (replay or 422). Cursor pagination of a person's bookings | `src/idempotency.ts`, `src/routes/bookings.ts` |
| 5 | At most 5 booking attempts per email per minute (429 + `Retry-After`) | `src/rate-limit.ts` |

## Design decisions

**The database enforces every guarantee.** The API runs on serverless functions, so many instances can serve requests at once. Locks or counters held in memory would only protect one instance. Each guarantee is therefore enforced by Postgres:

- **No double booking.** A partial unique index allows only one confirmed booking per slot: `UNIQUE (slot_id) WHERE status = 'confirmed'`. Bookings are inserted with `ON CONFLICT … DO NOTHING`. When requests race, Postgres makes the later inserts wait for the first and then skips them, so exactly one gets 201 and the rest get 409. Cancelling sets the status to `cancelled`, which takes the row out of the index and frees the slot. The test suite fires 25 simultaneous bookings at one slot and checks for exactly one 201.
- **Atomic cancellation.** Cancelling runs `UPDATE … WHERE status = 'confirmed' RETURNING`. Two simultaneous cancels give one 200 and one 409.
- **Idempotency.** `POST /bookings` runs in a single transaction. When an `Idempotency-Key` is sent, the transaction first takes an advisory lock on that key, so concurrent retries queue behind the first request instead of racing it.
  - The first request's response is stored together with a SHA-256 of the body. The body is canonicalised first, so key order doesn't matter.
  - Retries with the same body replay the stored response: same status, same booking `id`, plus an `Idempotent-Replayed: true` header. Error responses are replayed too.
  - The same key with a different body returns 422.
  - A 429 is not stored, so a client can retry with the same key once the rate limit clears.
  - Keys expire after 24 hours.
- **Rate limiting.** Each email gets a sliding window of 5 attempts per 60 seconds, stored in Postgres behind a per-email advisory lock, so a burst can't overshoot.
  - Failed attempts count, as the spec requires.
  - Idempotent replays don't count, because they are the same attempt.
  - `Retry-After` is the number of whole seconds until the oldest attempt leaves the window.
  - A sliding window is used because a fixed per-minute bucket would allow up to 10 bookings in two seconds around a minute boundary.

**Validation order** for `POST /bookings`:

1. API key (401)
2. Malformed JSON (400)
3. Idempotency replay or mismatch (422)
4. Rate limit (429)
5. Fields (400)
6. Slot exists (404)
7. Slot not yet started (400)
8. Slot still free (409)

Name and email are trimmed and the email is stored in lower case. Listing bookings by email ignores case.

**Pagination.** Pagination is keyset-based on an insert sequence rather than `OFFSET`, so pages stay stable when new bookings arrive. `next_cursor` is an opaque base64url token and is `null` on the last page. A `limit` outside 1–50 returns 400, and so does a tampered cursor.

**Faithful data.** Slot `start` and `end` are returned exactly as `/reset` received them. A separate parsed `timestamptz` column is used for sorting and the "already started" check. `/reset` also clears stored idempotency keys and rate-limit history, so every reset starts from a clean state.

**The web page never sees the API key.** The page calls `/web-api/*`, a small server-side proxy (`src/web-proxy.ts`). It forwards an allow-list of routes to the API and adds the key on the server. `/reset` isn't exposed through it.

The page itself:
- lists upcoming slots by day, with a provider filter
- books a slot, sending an `Idempotency-Key` per submission so a double-click or retry can't double-book
- shows a confirmation kept in the URL, so it survives a refresh
- looks up a booking by reference, lists a person's bookings with **Load more**, and cancels
- explains 409 (slot just taken) and 429 (countdown to retry) in plain words

**Other details.** The API key is compared in constant time. Every error has the shape `{"error": "…"}`, including unknown routes (404) and unexpected failures (500).

## API

All requests need the `X-API-Key` header.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/reset` | `{"slots": [...]}`. Deletes every booking and replaces all slots |
| `GET` | `/slots?provider=` | Earliest first, with `available` |
| `POST` | `/bookings` | `{"slot_id", "name", "email"}`, optional `Idempotency-Key` header. Returns 201 |
| `GET` | `/bookings?email=&limit=&cursor=` | That person's bookings, oldest first, as `{bookings, next_cursor}` |
| `GET` | `/bookings/:id` | 200 or 404 |
| `DELETE` | `/bookings/:id` | Cancels the booking. 200, 404, or 409 if already cancelled |

```sh
curl -X POST "$BASE/bookings" -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" -d '{"slot_id":"s1","name":"Ada Obi","email":"ada@example.com"}'
```

## Running locally

Requires Node 22+ and Docker.

```sh
docker run -d --name clinic-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=clinic -p 5432:5432 postgres:17-alpine
cp .env.example .env          # DATABASE_URL and API_KEY
npm install
DATABASE_URL=postgres://postgres:postgres@localhost:5432/clinic npm run db:migrate
npm run dev                   # web page and API on http://localhost:5173
npm test                      # integration tests against the real database
```

`npm run lint`, `npm run typecheck` and `npm run build` complete the checks. CI runs all of them against a Postgres service container on every push.

## Project layout

```
api/index.ts           Vercel function entry (exports the Hono app)
src/app.ts             Routing, auth, JSON error handling
src/routes/            /reset, /slots and /bookings handlers
src/bookings.ts        Booking validation and creation
src/idempotency.ts     Idempotency-Key handling
src/rate-limit.ts      Per-email sliding-window limit
src/web-proxy.ts       Server-side proxy used by the web page
db/schema.sql          Tables and indexes (safe to re-run)
web/                   React + Tailwind page (Vite)
test/                  One test file per level, plus the proxy
```

## What I'd add next

- A per-IP limit on the public `/web-api` proxy. The spec's limit is per email, so one person could still spam bookings using many different emails.
- Email verification before anyone can list a person's bookings by email.
- A scheduled cleanup job for expired idempotency keys, plus structured logs and request IDs.
