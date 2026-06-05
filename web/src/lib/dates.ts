import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";

/**
 * Format a Date as ISO YYYY-MM-DD (date-only, no time / timezone).
 * Used to send DateOnly values to the backend.
 */
export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Parse an ISO YYYY-MM-DD into a Date (midnight local).
 */
export function fromIsoDate(s: string): Date {
  const d = parseISO(s);
  if (!isValid(d)) throw new Error(`Invalid ISO date: ${s}`);
  return d;
}

/**
 * Today at 00:00 local. Used for "min check-in".
 */
export function today(): Date {
  return startOfDay(new Date());
}

/**
 * Number of nights between checkIn and checkOut (calendar-day diff).
 */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return differenceInCalendarDays(checkOut, checkIn);
}

/**
 * Display range: "Mar 14 → Mar 21 (7 nights)"
 */
export function formatRange(checkIn: Date, checkOut: Date): string {
  const nights = nightsBetween(checkIn, checkOut);
  return `${format(checkIn, "MMM d")} → ${format(checkOut, "MMM d")} (${nights} night${nights === 1 ? "" : "s"})`;
}

/**
 * Display a single date in a friendly format: "Mar 14, 2026".
 */
export function formatDate(d: Date): string {
  return format(d, "MMM d, yyyy");
}

/**
 * Format a UTC ISO timestamp into a short readable form: "Jun 15, 14:32".
 */
export function formatDateTime(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMM d, HH:mm") : iso;
}

/**
 * Time remaining until an ISO timestamp, expressed as "{m}m {s}s" or "expired".
 */
export function timeUntil(iso: string, now: Date = new Date()): { ms: number; label: string } {
  const target = parseISO(iso);
  if (!isValid(target)) return { ms: 0, label: "expired" };
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { ms: 0, label: "expired" };
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { ms, label: `${minutes}m ${seconds.toString().padStart(2, "0")}s` };
}

export { addDays, isAfter, isBefore };
