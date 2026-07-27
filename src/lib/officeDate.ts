/** Local calendar helpers for the office day navigator (DD.MM.YYYY). */

export function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatSiDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${m}.${d.getFullYear()}`;
}

export function formatSiTime(d: Date): string {
  return d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
}

/** Normalize reminder form time to `HH:mm` (24h). Accepts `16:48` or `16.48`. */
export function normalizeRemindTime(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim().replace(/\./g, ":");
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` → `DD.MM.YYYY` for display. */
export function formatSiDateFromDayKey(dayKey: string | null | undefined): string {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return "";
  const parts = dayKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return "";
  return formatSiDate(new Date(y, m - 1, d));
}

export function formatSiTimeFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatSiTime(d);
}

export function formatSiDateFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatSiDate(d);
}

/**
 * Full stamp for audit/timeline: date and time are always both present in storage;
 * UI shows both as `DD.MM.YYYY · HH:mm`.
 */
export function formatSiDateTimeFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatSiDate(d)} · ${formatSiTime(d)}`;
}

/**
 * Compact stamp: time only when same local calendar day as `relativeTo`,
 * otherwise date · time (Mark: sometimes only time, sometimes both).
 */
export function formatSiDateTimeCompact(
  iso: string | null | undefined,
  relativeTo: Date = new Date()
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isSameLocalDay(d, relativeTo)) return formatSiTime(d);
  return `${formatSiDate(d)} · ${formatSiTime(d)}`;
}

export function addDays(d: Date, days: number): Date {
  const next = startOfLocalDay(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Parse form dates: `DD.MM.YYYY`, `D.M.YYYY`, or `YYYY-MM-DD`. */
export function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const si = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/.exec(trimmed);
  if (si) {
    const d = new Date(Number(si[3]), Number(si[2]) - 1, Number(si[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** Local calendar day of an ISO datetime or date string. */
export function isoToLocalDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // Already a date-only string
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return null;
  }
  return toIsoDate(d);
}

/** Noon local → UTC ISO for `scheduled_at` (avoids timezone day-shift). */
export function localDayToScheduledAt(d: Date): string {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  return local.toISOString();
}

export function boardTodayKey(): string {
  return toIsoDate(startOfLocalDay());
}

const CALENDAR_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Office board `?date=` query param — valid YYYY-MM-DD or default today (local). */
export function parseOfficeBoardDayParam(
  dateParam: string | null | undefined,
  todayKey: string = boardTodayKey()
): string {
  if (dateParam && CALENDAR_DAY_RE.test(dateParam)) return dateParam;
  return todayKey;
}

export function jobBelongsToDay(
  job: { scheduled_at: string | null; created_at: string },
  dayKey: string,
  todayKey: string = toIsoDate(startOfLocalDay())
): boolean {
  const scheduledKey = isoToLocalDayKey(job.scheduled_at);
  if (scheduledKey) return scheduledKey === dayKey;
  // Undated jobs stay on today's board (legacy cards + open work).
  return dayKey === todayKey;
}

export function reminderBelongsToDay(
  reminder: { remind_on: string | null; created_at: string },
  dayKey: string,
  todayKey: string
): boolean {
  if (dayKey === todayKey) {
    // Default product rule: undated or due today/overdue stay on today's board.
    if (!reminder.remind_on) return true;
    return reminder.remind_on <= todayKey;
  }
  if (reminder.remind_on) return reminder.remind_on === dayKey;
  return isoToLocalDayKey(reminder.created_at) === dayKey;
}

export function notificationBelongsToDay(
  notification: { created_at: string },
  dayKey: string
): boolean {
  return isoToLocalDayKey(notification.created_at) === dayKey;
}

/** App business timezone (Mark / Slovenian managers). */
export const APP_TIMEZONE = "Europe/Ljubljana";

/** Calendar day + hour-of-day in a given IANA timezone. */
export function getZonedDayAndHour(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): { calendarDay: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = Number(get("hour"));
  // Some engines report midnight as 24.
  if (hour === 24) hour = 0;

  return { calendarDay: `${year}-${month}-${day}`, hour };
}

