// P2: every date and time in this app is NAIVE OFFICE LOCAL time — a calendar
// date "YYYY-MM-DD" and a wall-clock "HH:MM", with no time zone, exactly as the
// API stores and judges them. Never convert through UTC: no toISOString(), no
// Date.parse of a bare date string, no offsets. The browser's own clock is read
// as the office's wall clock (the API judges "in the past" against its local
// clock, which is the office's).

export type OfficeDate = string; // YYYY-MM-DD
export type OfficeTime = string; // HH:MM

const pad = (n: number): string => String(n).padStart(2, "0");

/** Today's date on the office wall clock. */
export function todayOffice(now: Date = new Date()): OfficeDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The current wall-clock time, HH:MM. */
export function nowOffice(now: Date = new Date()): OfficeTime {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** HH:MM -> minutes since midnight. NaN when malformed. */
export function toMinutes(time: OfficeTime): number {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

/** Normalise "HH:MM[:SS]" to "HH:MM". */
export function hhmm(time: string): OfficeTime {
  return time.slice(0, 5);
}

/** Does the start (date + time) already lie in the past on the office clock? */
export function isPast(date: OfficeDate, time: OfficeTime, now: Date = new Date()): boolean {
  const today = todayOffice(now);
  if (date !== today) return date < today;
  return hhmm(time) <= nowOffice(now);
}

/** Is `end` strictly after `start`? */
export function endsAfterStart(start: OfficeTime, end: OfficeTime): boolean {
  return toMinutes(end) > toMinutes(start);
}

/** Do two same-day ranges overlap (touching ends do not)? */
export function rangesOverlap(
  aStart: OfficeTime,
  aEnd: OfficeTime,
  bStart: OfficeTime,
  bEnd: OfficeTime,
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

/** "2026-01-15" -> a local Date at midnight, built from parts (never parsed as UTC). */
function parts(date: OfficeDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Display form of a date, e.g. "Thu 15 Jan 2026". No zone shift is possible. */
export function formatOfficeDate(date: OfficeDate): string {
  return parts(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Display form of a range, e.g. "13:00 – 14:00". */
export function formatOfficeRange(start: OfficeTime, end: OfficeTime): string {
  return `${hhmm(start)} – ${hhmm(end)}`;
}
