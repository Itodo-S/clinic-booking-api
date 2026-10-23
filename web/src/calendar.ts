import type { Booking, Slot } from "./api";

const icsTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");

/** Downloads the appointment as an .ics file that any calendar app can import. */
export function downloadCalendarEvent(booking: Booking, slot: Slot) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CarePoint Clinic//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@carepoint-clinic`,
    `DTSTAMP:${icsTime(new Date().toISOString())}`,
    `DTSTART:${icsTime(slot.start)}`,
    `DTEND:${icsTime(slot.end)}`,
    `SUMMARY:Appointment with ${slot.provider}`,
    `DESCRIPTION:CarePoint Clinic booking reference ${booking.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "carepoint-appointment.ics";
  link.click();
  URL.revokeObjectURL(url);
}
