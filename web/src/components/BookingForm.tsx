import { AlertCircle, CalendarDays, Clock, Lock, Mail, User } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ApiError, api, type Booking, type Slot } from "../api";
import { EMAIL_PATTERN, formatDate, formatRange } from "../format";
import { Avatar, Button } from "../ui";

interface Props {
  slot: Slot;
  onBooked: (booking: Booking) => void;
  onSlotTaken: () => void;
}

interface FieldProps {
  label: string;
  icon: ReactNode;
  error?: string;
  hint?: string;
  input: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}

function Field({ label, icon, error, hint, input }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          {icon}
        </span>
        {input({
          id,
          "aria-invalid": Boolean(error),
          "aria-describedby": error || hint ? noteId : undefined,
        })}
      </div>
      {(error || hint) && (
        <p id={noteId} className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-slate-500"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-10 text-[15px] shadow-xs outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/15";

export function BookingForm({ slot, onBooked, onSlotTaken }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
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
    const found = {
      name: name.trim() ? undefined : "Please enter your full name.",
      email: EMAIL_PATTERN.test(email.trim()) ? undefined : "Please enter a valid email address.",
    };
    setErrors(found);
    if (found.name || found.email) return;

    setSubmitting(true);
    try {
      onBooked(await api.book({ slot_id: slot.id, name, email }, idempotencyKey.current));
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      if (err.status === 409) return onSlotTaken();
      if (err.status === 429) {
        setRetryAt(Date.now() + err.retryAfter * 1000);
        setNow(Date.now());
        return setErrors({ form: "Too many booking attempts for this email. Please wait." });
      }
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={slot.provider} />
          <div>
            <p className="text-xs font-medium tracking-wide text-brand-800 uppercase">
              Appointment with
            </p>
            <p className="font-semibold">{slot.provider}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <dt>
              <CalendarDays aria-label="Date" className="size-4 text-brand-700" />
            </dt>
            <dd>{formatDate(slot.start)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt>
              <Clock aria-label="Time" className="size-4 text-brand-700" />
            </dt>
            <dd className="tabular-nums">{formatRange(slot.start, slot.end)}</dd>
          </div>
        </dl>
      </div>

      <Field
        label="Full name"
        icon={<User aria-hidden className="size-4" />}
        error={errors.name}
        input={(props) => (
          <input
            {...props}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
      />
      <Field
        label="Email address"
        icon={<Mail aria-hidden className="size-4" />}
        error={errors.email}
        hint="We'll use this to find your appointments."
        input={(props) => (
          <input
            {...props}
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
          />
        )}
      />

      <div aria-live="polite">
        {errors.form && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {errors.form}
          </p>
        )}
      </div>

      <Button
        type="submit"
        loading={submitting}
        disabled={waitSeconds > 0}
        className="min-h-11 w-full text-[15px]"
      >
        {submitting
          ? "Confirming…"
          : waitSeconds > 0
            ? `Try again in ${waitSeconds}s`
            : "Confirm appointment"}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <Lock aria-hidden className="size-3.5" />
        Your details are only used to manage this appointment.
      </p>
    </form>
  );
}
