import { CalendarX2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Slot } from "../api";
import {
  dayKey,
  formatDate,
  formatDayOfMonth,
  formatMonth,
  formatTime,
  formatWeekday,
} from "../format";
import { Avatar, focusRing } from "../ui";

interface Props {
  slots: Slot[];
  selectedId?: string;
  onSelect: (slot: Slot) => void;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

export function SlotPicker({ slots, selectedId, onSelect }: Props) {
  const [provider, setProvider] = useState<string>();
  const [day, setDay] = useState<string>();

  const upcoming = useMemo(() => slots.filter((s) => Date.parse(s.start) > Date.now()), [slots]);
  const providers = useMemo(() => [...new Set(upcoming.map((s) => s.provider))].sort(), [upcoming]);
  const days = useMemo(
    () =>
      groupBy(
        upcoming.filter((s) => !provider || s.provider === provider),
        (s) => dayKey(s.start),
      ),
    [upcoming, provider],
  );

  // Default to the first day that still has an open slot.
  const dayKeys = [...days.keys()];
  const activeDay =
    day && days.has(day)
      ? day
      : (dayKeys.find((key) => days.get(key)?.some((s) => s.available)) ?? dayKeys[0]);
  const daySlots = activeDay ? (days.get(activeDay) ?? []) : [];

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <CalendarX2 aria-hidden className="size-10 text-slate-400" />
        <p className="mt-3 font-semibold">No upcoming appointments</p>
        <p className="mt-1 text-sm text-slate-500">
          New times are added regularly. Check back soon.
        </p>
      </div>
    );
  }

  const chip = (selected: boolean) =>
    `min-h-9 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 ${focusRing} ${selected ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-600 hover:text-brand-800"}`;

  return (
    <div className="space-y-6">
      {providers.length > 1 && (
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-slate-700">Provider</legend>
          <div className="flex flex-wrap gap-2">
            {[undefined, ...providers].map((name) => (
              <button
                key={name ?? "any"}
                type="button"
                aria-pressed={provider === name}
                onClick={() => setProvider(name)}
                className={chip(provider === name)}
              >
                {name ?? "Any provider"}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-slate-700">Date</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {[...days].map(([key, list]) => {
            const open = list.filter((s) => s.available).length;
            const first = list[0]?.start ?? "";
            const selected = key === activeDay;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                aria-label={`${formatDate(first)}, ${open} available`}
                onClick={() => setDay(key)}
                className={`flex w-20 shrink-0 cursor-pointer flex-col items-center rounded-xl border py-2.5 transition-colors duration-200 ${focusRing} ${selected ? "border-brand-700 bg-brand-700 text-white shadow-sm" : "border-slate-200 bg-white hover:border-brand-600"}`}
              >
                <span
                  className={`text-xs font-medium uppercase ${selected ? "text-brand-100" : "text-slate-500"}`}
                >
                  {formatWeekday(first)}
                </span>
                <span className="text-xl font-bold">{formatDayOfMonth(first)}</span>
                <span className={`text-xs ${selected ? "text-brand-100" : "text-slate-500"}`}>
                  {formatMonth(first)}
                </span>
                <span
                  className={`mt-1 text-[11px] font-semibold ${selected ? "text-white" : open ? "text-emerald-700" : "text-slate-400"}`}
                >
                  {open ? `${open} open` : "Full"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <section aria-label={activeDay ? `Times on ${formatDate(daySlots[0]?.start ?? "")}` : ""}>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          {daySlots[0] && formatDate(daySlots[0].start)}
        </h3>
        <div className="space-y-3">
          {[...groupBy(daySlots, (s) => s.provider)].map(([name, list]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={name} />
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-xs text-slate-500">
                    {list.filter((s) => s.available).length} of {list.length} times available
                  </p>
                </div>
              </div>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {list.map((slot) => {
                  const selected = slot.id === selectedId;
                  return (
                    <li key={slot.id}>
                      <button
                        type="button"
                        disabled={!slot.available}
                        aria-pressed={selected}
                        aria-label={`${formatTime(slot.start)} with ${name}${slot.available ? "" : ", booked"}`}
                        onClick={() => onSelect(slot)}
                        className={`min-h-10 w-full cursor-pointer rounded-lg border text-sm font-semibold tabular-nums transition-colors duration-200 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:line-through ${focusRing} ${selected ? "border-brand-700 bg-brand-700 text-white" : "border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-600 hover:bg-brand-100"}`}
                      >
                        {formatTime(slot.start)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
