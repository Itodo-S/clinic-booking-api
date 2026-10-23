import { type FormEvent, useState } from "react";
import { ApiError, api, type Booking, type Slot } from "../api";
import { BookingDetails } from "./BookingDetails";

interface Props {
  slotsById: Map<string, Slot>;
  onChange: (booking: Booking) => void;
}

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
const buttonClass =
  "rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-400";

export function MyBookings({ slotsById, onChange }: Props) {
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [found, setFound] = useState<Booking>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError("");
    try {
      await action();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setError(
        err.status === 404 ? "We couldn't find a booking with that reference." : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  const search = (event: FormEvent) => {
    event.preventDefault();
    setFound(undefined);
    return run(async () => {
      const page = await api.bookingsFor(email.trim());
      setSearched(email.trim().toLowerCase());
      setBookings(page.bookings);
      setCursor(page.next_cursor);
    });
  };

  const loadMore = () =>
    run(async () => {
      if (!cursor) return;
      const page = await api.bookingsFor(searched, cursor);
      setBookings((current) => [...current, ...page.bookings]);
      setCursor(page.next_cursor);
    });

  const lookUp = (event: FormEvent) => {
    event.preventDefault();
    setSearched("");
    return run(async () => setFound(await api.booking(reference.trim())));
  };

  const update = (booking: Booking) => {
    setBookings((current) => current.map((b) => (b.id === booking.id ? booking : b)));
    setFound((current) => (current?.id === booking.id ? booking : current));
    onChange(booking);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-5">
          <label htmlFor="lookup-email" className="font-semibold">
            Your bookings
          </label>
          <p className="mb-3 text-sm text-slate-500">Enter the email you booked with.</p>
          <div className="flex gap-2">
            <input
              id="lookup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={loading} className={buttonClass}>
              Show
            </button>
          </div>
        </form>
        <form onSubmit={lookUp} className="rounded-2xl border border-slate-200 bg-white p-5">
          <label htmlFor="lookup-reference" className="font-semibold">
            Find a booking
          </label>
          <p className="mb-3 text-sm text-slate-500">Paste the reference from your confirmation.</p>
          <div className="flex gap-2">
            <input
              id="lookup-reference"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
            />
            <button type="submit" disabled={loading} className={buttonClass}>
              Find
            </button>
          </div>
        </form>
      </div>

      <p role="alert" aria-live="polite" className="text-sm text-red-700 empty:hidden">
        {error}
      </p>

      {found && (
        <BookingDetails booking={found} slot={slotsById.get(found.slot_id)} onChange={update} />
      )}

      {searched && (
        <section aria-live="polite" className="space-y-3">
          <h2 className="font-semibold">Bookings for {searched}</h2>
          {bookings.length === 0 && <p className="text-slate-500">No bookings yet.</p>}
          {bookings.map((booking) => (
            <BookingDetails
              key={booking.id}
              booking={booking}
              slot={slotsById.get(booking.slot_id)}
              onChange={update}
            />
          ))}
          {cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 font-medium text-slate-700 hover:border-teal-600 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
