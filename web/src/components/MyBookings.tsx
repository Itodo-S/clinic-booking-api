import { AlertCircle, Hash, Inbox, Mail, Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ApiError, api, type Booking, type Slot } from "../api";
import { formatDayOfMonth, formatMonth, formatRange, formatWeekday } from "../format";
import { Button, focusRing, StatusBadge } from "../ui";
import { CancelButton } from "./CancelButton";
import { CopyReference } from "./CopyReference";

interface Props {
  slotsById: Map<string, Slot>;
  onChange: (booking: Booking) => void;
}

type Mode = "email" | "reference";

function BookingRow({
  booking,
  slot,
  onChange,
}: {
  booking: Booking;
  slot?: Slot;
  onChange: (booking: Booking) => void;
}) {
  const upcoming = !slot || Date.parse(slot.start) > Date.now();
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
      <div
        className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-2 ${booking.status === "confirmed" ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-slate-500"}`}
      >
        {slot ? (
          <>
            <span className="text-xs font-semibold uppercase">{formatMonth(slot.start)}</span>
            <span className="text-2xl leading-none font-bold">{formatDayOfMonth(slot.start)}</span>
            <span className="text-xs">{formatWeekday(slot.start)}</span>
          </>
        ) : (
          <Hash aria-hidden className="my-3 size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold tabular-nums">
            {slot
              ? `${formatRange(slot.start, slot.end)} · ${slot.provider}`
              : `Slot ${booking.slot_id}`}
          </p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{booking.name}</p>
        <CopyReference id={booking.id} />
      </div>
      {booking.status === "confirmed" && upcoming && (
        <CancelButton booking={booking} onChange={onChange} />
      )}
    </li>
  );
}

export function MyBookings({ slotsById, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("email");
  const [query, setQuery] = useState("");
  const [heading, setHeading] = useState("");
  const [bookings, setBookings] = useState<Booking[]>();
  const [cursor, setCursor] = useState<string | null>(null);
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
    const value = query.trim();
    if (!value) return;
    return run(async () => {
      if (mode === "reference") {
        setBookings([await api.booking(value)]);
        setCursor(null);
        setHeading("Booking found");
        return;
      }
      const page = await api.bookingsFor(value);
      setBookings(page.bookings);
      setCursor(page.next_cursor);
      setHeading(`Appointments for ${value.toLowerCase()}`);
    });
  };

  const loadMore = () =>
    run(async () => {
      if (!cursor) return;
      const page = await api.bookingsFor(query.trim(), cursor);
      setBookings((current) => [...(current ?? []), ...page.bookings]);
      setCursor(page.next_cursor);
    });

  const update = (booking: Booking) => {
    setBookings((current) => current?.map((b) => (b.id === booking.id ? booking : b)));
    onChange(booking);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setQuery("");
    setError("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My appointments</h1>
        <p className="mt-1 text-slate-600">
          Look up your appointments with the email you booked with, or a booking reference.
        </p>
      </div>

      <form
        onSubmit={search}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <fieldset className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
          <legend className="sr-only">Search by</legend>
          {(["email", "reference"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => switchMode(value)}
              className={`min-h-8 cursor-pointer rounded-md px-3 text-sm font-semibold transition-colors duration-200 ${focusRing} ${mode === value ? "bg-white text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {value === "email" ? "Email address" : "Booking reference"}
            </button>
          ))}
        </fieldset>
        <label htmlFor="lookup" className="sr-only">
          {mode === "email" ? "Email address" : "Booking reference"}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              {mode === "email" ? (
                <Mail aria-hidden className="size-4" />
              ) : (
                <Hash aria-hidden className="size-4" />
              )}
            </span>
            <input
              id="lookup"
              type={mode === "email" ? "email" : "text"}
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "email" ? "name@example.com" : "Paste your booking reference"}
              className="block min-h-11 w-full rounded-lg border border-slate-300 py-2 pr-3 pl-10 text-[15px] shadow-xs outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15"
            />
          </div>
          <Button type="submit" loading={loading && !bookings?.length} className="min-h-11">
            <Search aria-hidden className="size-4" />
            Find
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6 space-y-4">
        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {bookings && !error && (
          <>
            <h2 className="text-sm font-semibold text-slate-700">{heading}</h2>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <Inbox aria-hidden className="size-10 text-slate-400" />
                <p className="mt-3 font-semibold">No appointments yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Bookings made with this email will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    slot={slotsById.get(booking.slot_id)}
                    onChange={update}
                  />
                ))}
              </ul>
            )}
            {cursor && (
              <Button variant="secondary" loading={loading} onClick={loadMore} className="w-full">
                Load more
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
