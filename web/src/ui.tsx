import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

const variants = {
  primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800 disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-60",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${variants[variant]} ${focusRing} ${className}`}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />}
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: "confirmed" | "cancelled" }) {
  return status === "confirmed" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
      <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
      Confirmed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-500/20 ring-inset">
      <span aria-hidden className="size-1.5 rounded-full bg-slate-400" />
      Cancelled
    </span>
  );
}

const avatarTones = [
  "bg-brand-100 text-brand-800",
  "bg-emerald-100 text-emerald-800",
  "bg-indigo-100 text-indigo-800",
  "bg-amber-100 text-amber-800",
];

/** Initials avatar for a provider, with a stable colour per name. */
export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tone = avatarTones[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 4];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${tone} ${size === "lg" ? "size-12 text-base" : "size-10 text-sm"}`}
    >
      {initials}
    </span>
  );
}
