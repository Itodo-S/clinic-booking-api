const day = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

export const formatDay = (iso: string) => day.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));
export const formatRange = (start: string, end: string) =>
  `${formatTime(start)} – ${formatTime(end)}`;

export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
