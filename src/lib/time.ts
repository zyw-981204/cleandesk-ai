export const TIME_ZONE = "America/Los_Angeles";

export function todayISO(now = new Date(), timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function zonedTimeToUtc(
  date: string,
  hour: number,
  minute = 0,
  timeZone = TIME_ZONE,
): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const utc = new Date(`${date}T${hh}:${mm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utc);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  const hourValue = read("hour") === "24" ? "0" : read("hour");
  const asZoned = Date.UTC(
    Number(read("year")),
    Number(read("month")) - 1,
    Number(read("day")),
    Number(hourValue),
    Number(read("minute")),
    Number(read("second")),
  );
  return new Date(utc.getTime() - (asZoned - utc.getTime()));
}

export function formatTime(iso: string, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatWhen(iso: string, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function localHour(iso: string, timeZone = TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number(hour === "24" ? "0" : hour);
}

export function localDateISO(iso: string, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function upcomingWeekday(fromIso: string, weekday: number): string {
  const current = weekdayIndex(fromIso);
  const delta = (weekday - current + 7) % 7 || 7;
  return addDaysISO(fromIso, delta);
}
