import type { WorkingHours } from "@/lib/types";

/**
 * The organisation's time zone and working hours: pure helpers, safe to use in client components.
 * The time zone is always an IANA name ("America/Toronto"), never a fixed offset, so daylight saving is handled
 * by the runtime's time zone database.
 */

export type OrgSettings = { timezone: string; hours: WorkingHours };

/** Weekdays in the order Zoho and the Settings form list them (Monday first); the number is the JS weekday (0 = Sunday). */
export const WEEKDAYS = [
  { day: 1, name: "Monday" },
  { day: 2, name: "Tuesday" },
  { day: 3, name: "Wednesday" },
  { day: 4, name: "Thursday" },
  { day: 5, name: "Friday" },
  { day: 6, name: "Saturday" },
  { day: 0, name: "Sunday" },
] as const;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "9:00" / "09:00" → "09:00"; null if it isn't a 24-hour time. */
export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const text = `${match[1].padStart(2, "0")}:${match[2]}`;
  return HHMM.test(text) ? text : null;
}

export const isValidTimeZone = (value: unknown): value is string => {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

/** Working hours from per-weekday entries (`[weekday, start, end]`); null if no day is valid or an end isn't after its start. */
export function hoursFromDays(entries: { day: number; start: string; end: string }[]): WorkingHours | null {
  const byDay: Record<number, { start: string; end: string }> = {};
  for (const e of entries) {
    const start = normalizeTime(e.start);
    const end = normalizeTime(e.end);
    if (!Number.isInteger(e.day) || e.day < 0 || e.day > 6 || !start || !end || start >= end) return null;
    byDay[e.day] = { start, end };
  }
  const days = Object.keys(byDay).map(Number);
  if (days.length === 0) return null;
  const first = byDay[days[0]];
  return { days: days.sort((a, b) => a - b), start: first.start, end: first.end, byDay };
}

/** Reads the saved JSON back into working hours; null if it is missing or damaged. */
export function parseHours(json: unknown): WorkingHours | null {
  if (typeof json !== "string" || json === "") return null;
  try {
    const raw = JSON.parse(json) as { byDay?: Record<string, { start?: unknown; end?: unknown }> };
    const entries = Object.entries(raw.byDay ?? {}).map(([day, h]) => ({ day: Number(day), start: String(h?.start ?? ""), end: String(h?.end ?? "") }));
    return hoursFromDays(entries);
  } catch {
    return null;
  }
}

/** Every time zone the runtime knows, for the searchable list in Settings. */
export function listTimeZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  return supported ? supported("timeZone") : [];
}

/** "America/Toronto (GMT-4)": the zone with its offset right now, so people can tell similar names apart. */
export function timeZoneLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName");
    return `${timeZone} (${part?.value ?? ""})`;
  } catch {
    return timeZone;
  }
}
