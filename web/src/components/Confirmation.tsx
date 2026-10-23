import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Hash,
  Mail,
  User,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Booking, Slot } from "../api";
import { downloadCalendarEvent } from "../calendar";
import { formatDate, formatRange } from "../format";
import { Avatar, Button, StatusBadge } from "../ui";
import { CancelButton } from "./CancelButton";
import { CopyReference } from "./CopyReference";

interface Props {
  booking: Booking;
  slot?: Slot;
  onChange: (booking: Booking) => void;
  onBookAnother: () => void;
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-slate-400">{icon}</span>
      <dt className="w-24 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function Confirmation({ booking, slot, onChange, onBookAnother }: Props) {
  const confirmed = booking.status === "confirmed";
  const upcoming = !slot || Date.parse(slot.start) > Date.now();

  return (
    <section className="mx-auto max-w-xl" aria-live="polite">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`px-6 py-8 text-center ${confirmed ? "bg-emerald-50" : "bg-slate-100"}`}>
          {confirmed ? (
            <CheckCircle2 aria-hidden className="mx-auto size-12 text-emerald-600" />
          ) : (
            <XCircle aria-hidden className="mx-auto size-12 text-slate-400" />
          )}
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            {confirmed ? "Appointment confirmed" : "Appointment cancelled"}
          </h2>
          <p className="mt-1 text-slate-600">
            {confirmed
              ? `You're booked in${slot ? ` with ${slot.provider}` : ""}. Keep your reference to manage it later.`
              : "This time is now free for someone else to book."}
          </p>
        </div>

        <div className="px-6 py-2">
          {slot && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={slot.provider} size="lg" />
                <div>
                  <p className="font-semibold">{slot.provider}</p>
                  <p className="text-sm text-slate-500">CarePoint Clinic</p>
                </div>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          )}
          <dl className="divide-y divide-slate-100">
            {slot && (
              <>
                <Row icon={<CalendarDays aria-hidden className="size-4" />} label="Date">
                  {formatDate(slot.start)}
                </Row>
                <Row icon={<Clock aria-hidden className="size-4" />} label="Time">
                  <span className="tabular-nums">{formatRange(slot.start, slot.end)}</span>
                </Row>
              </>
            )}
            <Row icon={<User aria-hidden className="size-4" />} label="Patient">
              {booking.name}
            </Row>
            <Row icon={<Mail aria-hidden className="size-4" />} label="Email">
              <span className="break-all">{booking.email}</span>
            </Row>
            <Row icon={<Hash aria-hidden className="size-4" />} label="Reference">
              <CopyReference id={booking.id} />
            </Row>
          </dl>
        </div>

        {confirmed && upcoming && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
            {slot && (
              <Button onClick={() => downloadCalendarEvent(booking, slot)}>
                <CalendarPlus aria-hidden className="size-4" />
                Add to calendar
              </Button>
            )}
            <CancelButton booking={booking} onChange={onChange} />
          </div>
        )}
      </div>

      <Button variant="ghost" onClick={onBookAnother} className="mt-4">
        <ArrowLeft aria-hidden className="size-4" />
        Book another appointment
      </Button>
    </section>
  );
}
