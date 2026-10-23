import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Booking, type Slot } from "./api";
import { BookingDetails } from "./components/BookingDetails";
import { BookingForm } from "./components/BookingForm";
import { MyBookings } from "./components/MyBookings";
import { SlotPicker } from "./components/SlotPicker";

type Tab = "book" | "manage";

/** Keeps the confirmation in the URL so a refresh or shared link shows it again. */
function setBookingParam(id?: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("booking", id);
  else url.searchParams.delete("booking");
  window.history.replaceState(null, "", url);
}

export function App() {
  const [tab, setTab] = useState<Tab>("book");
  const [slots, setSlots] = useState<Slot[]>();
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Slot>();
  const [confirmed, setConfirmed] = useState<Booking>();
  const [notice, setNotice] = useState("");

  const loadSlots = useCallback(() => {
    api
      .slots()
      .then((list) => {
        setSlots(list);
        setLoadError("");
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    loadSlots();
    const id = new URLSearchParams(window.location.search).get("booking");
    if (id) api.booking(id).then(setConfirmed, () => setBookingParam());
  }, [loadSlots]);

  const slotsById = useMemo(() => new Map(slots?.map((s) => [s.id, s])), [slots]);

  function handleBooked(booking: Booking) {
    setConfirmed(booking);
    setSelected(undefined);
    setBookingParam(booking.id);
    loadSlots();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSlotTaken() {
    setNotice("Sorry, someone has just booked that time. Please choose another.");
    setSelected(undefined);
    loadSlots();
  }

  function handleChange(booking: Booking) {
    setConfirmed((current) => (current?.id === booking.id ? booking : current));
    loadSlots();
  }

  function startOver() {
    setConfirmed(undefined);
    setBookingParam();
  }

  const tabClass = (value: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === value ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-teal-700 text-xl font-bold text-white">
              +
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Clinic appointments</h1>
              <p className="text-sm text-slate-500">Book a visit in under a minute</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-xl bg-slate-100 p-1" aria-label="Sections">
            <button
              type="button"
              className={tabClass("book")}
              aria-current={tab === "book"}
              onClick={() => setTab("book")}
            >
              Book
            </button>
            <button
              type="button"
              className={tabClass("manage")}
              aria-current={tab === "manage"}
              onClick={() => setTab("manage")}
            >
              My bookings
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {tab === "manage" ? (
          <MyBookings slotsById={slotsById} onChange={handleChange} />
        ) : confirmed ? (
          <section className="mx-auto max-w-xl space-y-4" aria-live="polite">
            {confirmed.status === "confirmed" ? (
              <div className="rounded-2xl bg-teal-700 p-5 text-white">
                <h2 className="text-xl font-bold">You're booked in</h2>
                <p className="text-teal-50">
                  Keep your reference; you'll need it to look up or cancel this appointment.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-200 p-5">
                <h2 className="text-xl font-bold">Appointment cancelled</h2>
                <p className="text-slate-600">The time is free for someone else to book.</p>
              </div>
            )}
            <BookingDetails
              booking={confirmed}
              slot={slotsById.get(confirmed.slot_id)}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={startOver}
              className="font-medium text-teal-700 hover:underline"
            >
              ← Book another appointment
            </button>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <section>
              <h2 className="mb-4 text-xl font-bold">Choose a time</h2>
              {notice && (
                <p
                  role="status"
                  className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  {notice}
                </p>
              )}
              {loadError ? (
                <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
                  {loadError}{" "}
                  <button type="button" onClick={loadSlots} className="font-semibold underline">
                    Try again
                  </button>
                </div>
              ) : slots ? (
                <SlotPicker
                  slots={slots}
                  selectedId={selected?.id}
                  onSelect={(slot) => {
                    setSelected(slot);
                    setNotice("");
                  }}
                />
              ) : (
                <p className="text-slate-500">Loading available times…</p>
              )}
            </section>
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">Your details</h2>
                {selected ? (
                  <BookingForm
                    key={selected.id}
                    slot={selected}
                    onBooked={handleBooked}
                    onSlotTaken={handleSlotTaken}
                  />
                ) : (
                  <p className="text-slate-500">Pick an available time to continue.</p>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
