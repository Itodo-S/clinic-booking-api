import { Check } from "lucide-react";

const labels = ["Choose a time", "Your details", "Confirmation"];

/** Progress through the booking flow; `current` is 0-based. */
export function Steps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Booking progress">
      {labels.map((label, i) => {
        const done = i < current || current === labels.length - 1;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="h-px w-5 bg-slate-300 sm:w-8" />}
            <span
              aria-current={active ? "step" : undefined}
              className={`grid size-6 place-items-center rounded-full text-xs font-bold ${done ? "bg-brand-700 text-white" : active ? "bg-brand-100 text-brand-800 ring-2 ring-brand-600" : "bg-slate-200 text-slate-500"}`}
            >
              {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`hidden font-medium sm:inline ${active || done ? "text-slate-900" : "text-slate-500"}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
