import { CalendarPlus, ClipboardList } from "lucide-react";
import { focusRing } from "../ui";

export type Tab = "book" | "manage";

const tabs = [
  { id: "book", label: "Book appointment", Icon: CalendarPlus },
  { id: "manage", label: "My appointments", Icon: ClipboardList },
] as const;

export function Header({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <a href="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
          <svg aria-hidden viewBox="0 0 32 32" className="size-9">
            <rect width="32" height="32" rx="9" className="fill-brand-700" />
            <path d="M13.5 8h5v5.5H24v5h-5.5V24h-5v-5.5H8v-5h5.5z" fill="white" />
          </svg>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight">CarePoint</span>
            <span className="block text-xs font-medium text-slate-500">Clinic</span>
          </span>
        </a>

        <nav aria-label="Main" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => onTab(id)}
              className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-200 sm:px-4 ${focusRing} ${tab === id ? "bg-white text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
