const fmt = (options: Intl.DateTimeFormatOptions) => {
  const formatter = new Intl.DateTimeFormat(undefined, options);
  return (iso: string) => formatter.format(new Date(iso));
};

export const formatDate = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const formatWeekday = fmt({ weekday: "short" });
export const formatDayOfMonth = fmt({ day: "numeric" });
export const formatMonth = fmt({ month: "short" });
export const formatTime = fmt({ hour: "2-digit", minute: "2-digit" });
export const formatRange = (start: string, end: string) =>
  `${formatTime(start)} – ${formatTime(end)}`;

/** Calendar day in the visitor's time zone, used to group slots by day. */
export const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
