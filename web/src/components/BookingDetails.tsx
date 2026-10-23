import { useState } from "react";
import { ApiError, api, type Booking, type Slot } from "../api";
import { formatDay, formatRange } from "../format";

interface Props {
  booking: Booking;
  slot?: Slot;
  onChange: (booking: Booking) => void;
}

export function BookingDetails({ booking, slot, onChange }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const cancelled = booking.status === "cancelled";
  const upcoming = !slot || Date.parse(slot.start) > Date.now();

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      onChange(await api.cancel(booking.id));
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // 409: it was cancelled elsewhere, so show the latest state.
      if (err.status === 409) onChange({ ...booking, status: "cancelled" });
      else setError(err.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">
            {slot ? formatDay(slot.start) : `Slot ${booking.slot_id}`}
          </p>
          {slot && (
            <p className="text-slate-600 tabular-nums">
              {formatRange(slot.start, slot.end)} · {slot.provider}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cancelled ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-800"}`}
        >
          {cancelled ? "Cancelled" : "Confirmed"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Name</dt>
        <dd>{booking.name}</dd>
        <dt className="text-slate-500">Email</dt>
        <dd className="break-all">{booking.email}</dd>
        <dt className="text-slate-500">Reference</dt>
        <dd className="flex items-center gap-2">
          <code className="break-all text-xs">{booking.id}</code>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 text-xs font-medium text-teal-700 hover:underline"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </dd>
      </dl>

      {!cancelled && upcoming && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {confirming ? (
            <>
              <span className="text-sm text-slate-700">Cancel this appointment?</span>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {busy ? "Cancelling…" : "Yes, cancel"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-red-300 hover:text-red-700"
            >
              Cancel appointment
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}
