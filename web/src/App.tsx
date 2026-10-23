import { AlertTriangle, CalendarDays, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Booking, type Slot } from "./api";
import { BookingForm } from "./components/BookingForm";
import { Confirmation } from "./components/Confirmation";
import { Header, type Tab } from "./components/Header";
import { MyBookings } from "./components/MyBookings";
import { SlotPicker } from "./components/SlotPicker";
import { Steps } from "./components/Steps";
import { timeZone } from "./format";
import { Button } from "./ui";

/** Keeps the confirmation in the URL so a refresh or shared link shows it again. */
function setBookingParam(id?: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("booking", id);
  else url.searchParams.delete("booking");
  window.history.replaceState(null, "", url);
}

function SlotsSkeleton() {
  return (
    <div aria-hidden className="space-y-4 motion-safe:animate-pulse">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 w-20 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-44 rounded-2xl bg-slate-200" />
      <div className="h-44 rounded-2xl bg-slate-200" />
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("book");
  const [slots, setSlots] = useState<Slot[]>();
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Slot>();
  const [confirmed, setConfirmed] = useState<Booking>();
  const [notice, setNotice] = useState("");
  const detailsRef = useRef<HTMLElement>(null);

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
    setNotice("Sorry, that time was just booked by someone else. Please choose another.");
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header tab={tab} onTab={setTab} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {tab === "manage" ? (
          <MyBookings slotsById={slotsById} onChange={handleChange} />
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Book an appointment
                </h1>
                <p className="mt-1 text-slate-600">
                  Choose a time that suits you. It takes less than a minute.
                </p>
              </div>
              <Steps current={confirmed ? 2 : selected ? 1 : 0} />
            </div>

            {confirmed ? (
              <Confirmation
                booking={confirmed}
                slot={slotsById.get(confirmed.slot_id)}
                onChange={handleChange}
                onBookAnother={startOver}
              />
            ) : (
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <section aria-labelledby="choose-time" className="min-w-0">
                  <h2 id="choose-time" className="sr-only">
                    Choose a time
                  </h2>
                  {notice && (
                    <div
                      role="status"
                      className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                    >
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <p className="flex-1">{notice}</p>
                      <button
                        type="button"
                        aria-label="Dismiss"
                        onClick={() => setNotice("")}
                        className="cursor-pointer rounded text-amber-700 hover:text-amber-900"
                      >
                        <X aria-hidden className="size-4" />
                      </button>
                    </div>
                  )}
                  {loadError ? (
                    <div
                      role="alert"
                      className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"
                    >
                      <p>{loadError}</p>
                      <Button variant="secondary" onClick={loadSlots}>
                        Try again
                      </Button>
                    </div>
                  ) : slots ? (
                    <SlotPicker
                      slots={slots}
                      selectedId={selected?.id}
                      onSelect={(slot) => {
                        setSelected(slot);
                        setNotice("");
                        // On narrow screens the form sits below the times, so bring it into view.
                        if (!window.matchMedia("(min-width: 1024px)").matches) {
                          detailsRef.current?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    />
                  ) : (
                    <SlotsSkeleton />
                  )}
                </section>

                <aside ref={detailsRef} className="scroll-mt-24 lg:sticky lg:top-24">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-lg font-bold">Your details</h2>
                    {selected ? (
                      <BookingForm
                        key={selected.id}
                        slot={selected}
                        onBooked={handleBooked}
                        onSlotTaken={handleSlotTaken}
                      />
                    ) : (
                      <div className="flex flex-col items-center rounded-xl bg-slate-50 px-4 py-10 text-center">
                        <CalendarDays aria-hidden className="size-9 text-brand-600" />
                        <p className="mt-3 font-semibold">Select a time to continue</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Pick a date and one of the available times.
                        </p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} CarePoint Clinic</p>
          <p>Times are shown in your time zone ({timeZone}).</p>
        </div>
      </footer>
    </div>
  );
}
