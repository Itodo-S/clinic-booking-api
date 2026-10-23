import { useState } from "react";
import { ApiError, api, type Booking } from "../api";
import { Button } from "../ui";

/** Two-step cancel: asks for confirmation inline before calling the API. */
export function CancelButton({
  booking,
  onChange,
}: {
  booking: Booking;
  onChange: (booking: Booking) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      onChange(await api.cancel(booking.id));
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // 409: it was already cancelled elsewhere, so show the latest state.
      if (err.status === 409) onChange({ ...booking, status: "cancelled" });
      else setError(err.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Cancel appointment
      </Button>
    );
  }
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Confirm cancellation</legend>
      <span className="text-sm font-medium text-slate-700">Cancel this appointment?</span>
      <Button variant="danger" loading={busy} onClick={cancel}>
        Yes, cancel
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
