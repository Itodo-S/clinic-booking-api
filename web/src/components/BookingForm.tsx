import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, api, type Booking, type Slot } from "../api";
import { EMAIL_PATTERN, formatDay, formatRange } from "../format";

interface Props {
  slot: Slot;
  onBooked: (booking: Booking) => void;
  onSlotTaken: () => void;
}

export function BookingForm({ slot, onBooked, onSlotTaken }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  // One key per distinct request: a double-click or a retry after a dropped connection
  // reuses it, so the server can never create two bookings for the same submission.
  const idempotencyKey = useRef(crypto.randomUUID());
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new request needs a new key
  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, [slot.id, name, email]);

  const waitSeconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  useEffect(() => {
    if (!waitSeconds) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Please enter your name.");
    if (!EMAIL_PATTERN.test(email.trim())) return setError("Please enter a valid email address.");

    setError("");
    setSubmitting(true);
    try {
      onBooked(await api.book({ slot_id: slot.id, name, email }, idempotencyKey.current));
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      if (err.status === 409) return onSlotTaken();
      if (err.status === 429) {
        setRetryAt(Date.now() + err.retryAfter * 1000);
        setNow(Date.now());
        return setError("Too many booking attempts for this email. Please wait a moment.");
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="rounded-xl bg-teal-50 p-4 text-teal-900">
        <p className="text-sm">{formatDay(slot.start)}</p>
        <p className="text-lg font-semibold tabular-nums">{formatRange(slot.start, slot.end)}</p>
        <p className="text-sm">with {slot.provider}</p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Full name
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-700">
        {error}
      </p>

      <button
        type="submit"
        disabled={submitting || waitSeconds > 0}
        className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        {submitting
          ? "Booking…"
          : waitSeconds > 0
            ? `Try again in ${waitSeconds}s`
            : "Confirm booking"}
      </button>
    </form>
  );
}
