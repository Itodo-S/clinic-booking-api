import { useMemo, useState } from "react";
import type { Slot } from "../api";
import { formatDay, formatRange, timeZone } from "../format";

interface Props {
  slots: Slot[];
  selectedId?: string;
  onSelect: (slot: Slot) => void;
}

export function SlotPicker({ slots, selectedId, onSelect }: Props) {
  const [provider, setProvider] = useState<string>();

  const upcoming = useMemo(() => slots.filter((s) => Date.parse(s.start) > Date.now()), [slots]);
  const providers = useMemo(() => [...new Set(upcoming.map((s) => s.provider))].sort(), [upcoming]);
  const days = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of upcoming) {
      if (provider && slot.provider !== provider) continue;
      const key = formatDay(slot.start);
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups];
  }, [upcoming, provider]);

  if (upcoming.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        There are no upcoming appointments right now. Please check back later.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {providers.length > 1 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Filter by provider</legend>
          {[undefined, ...providers].map((name) => (
            <button
              key={name ?? "all"}
              type="button"
              aria-pressed={provider === name}
              onClick={() => setProvider(name)}
              className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition aria-pressed:border-teal-700 aria-pressed:bg-teal-700 aria-pressed:text-white border-slate-300 bg-white text-slate-700 hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              {name ?? "All providers"}
            </button>
          ))}
        </fieldset>
      )}

      {days.map(([day, daySlots]) => (
        <section key={day} aria-label={day}>
          <h3 className="mb-2 text-sm font-semibold text-slate-500">{day}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {daySlots.map((slot) => (
              <li key={slot.id}>
                <button
                  type="button"
                  disabled={!slot.available}
                  aria-pressed={slot.id === selectedId}
                  onClick={() => onSelect(slot)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-600 aria-pressed:border-teal-700 aria-pressed:ring-2 aria-pressed:ring-teal-700/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 disabled:shadow-none disabled:hover:border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                >
                  <span>
                    <span className="block font-semibold tabular-nums">
                      {formatRange(slot.start, slot.end)}
                    </span>
                    <span className="block text-sm text-slate-500">{slot.provider}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${slot.available ? "bg-teal-50 text-teal-800" : "bg-slate-200 text-slate-600"}`}
                  >
                    {slot.available ? "Available" : "Booked"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-slate-500">Times are shown in your time zone ({timeZone}).</p>
    </div>
  );
}
