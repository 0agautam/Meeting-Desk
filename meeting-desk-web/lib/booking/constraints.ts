import type { SchedulingConstraints } from "@/lib/types";

/** Validation and wording for the scheduling constraints. Pure, so both the server and the desk panel can use it. */

export const EMPTY_CONSTRAINTS: SchedulingConstraints = {
  earliestDate: null,
  latestDate: null,
  avoidWeekdays: [],
  timeOfDay: "any",
  notBeforeTime: null,
  notAfterTime: null,
  urgency: "normal",
  other: "",
};

/** Sunday-first, matching Date#getDay and the model's output. */
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function asDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

/** "Tuesday", "tue", "Tues." or 2 → 2 (Sunday = 0); anything else → null. */
function asWeekday(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) return value;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^[0-6]$/.test(text)) return Number(text);
  const index = WEEKDAY_NAMES.findIndex((name) => text.length >= 3 && name.toLowerCase().startsWith(text.replace(/s$/, "")) );
  return index >= 0 ? index : null;
}

function asTime(value: unknown): string | null {
  return typeof value === "string" && TIME.test(value) ? value : null;
}

/** Turns anything (the model's reply, a form, a stored value) into valid constraints; whatever isn't valid is ignored. */
export function parseConstraints(raw: unknown): SchedulingConstraints {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const weekdays = Array.isArray(o.avoidWeekdays) ? o.avoidWeekdays.map(asWeekday).filter((n): n is number => n !== null) : [];
  const timeOfDay = o.timeOfDay === "morning" || o.timeOfDay === "afternoon" ? o.timeOfDay : "any";
  let earliestDate = asDate(o.earliestDate);
  let latestDate = asDate(o.latestDate);
  if (earliestDate && latestDate && earliestDate > latestDate) [earliestDate, latestDate] = [latestDate, earliestDate];
  let notBeforeTime = asTime(o.notBeforeTime);
  let notAfterTime = asTime(o.notAfterTime);
  if (notBeforeTime && notAfterTime && notBeforeTime >= notAfterTime) {
    notBeforeTime = null;
    notAfterTime = null;
  }
  return {
    earliestDate,
    latestDate,
    avoidWeekdays: [...new Set(weekdays)].sort(),
    timeOfDay,
    notBeforeTime,
    notAfterTime,
    urgency: o.urgency === "soon" || o.urgency === "today" ? o.urgency : o.urgent === true ? "soon" : "normal",
    other: typeof o.other === "string" ? o.other.trim().slice(0, 500) : "",
  };
}

/** True if the constraints narrow the times at all (the `other` note doesn't count). */
export function hasTimingConstraints(c: SchedulingConstraints): boolean {
  return !!(c.earliestDate || c.latestDate || c.avoidWeekdays.length || c.timeOfDay !== "any" || c.notBeforeTime || c.notAfterTime);
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
}

/** The constraints in plain words, e.g. ["on or after Oct 19", "not Fridays", "mornings only"]. */
export function describeConstraints(c: SchedulingConstraints): string[] {
  const parts: string[] = [];
  if (c.urgency === "today") parts.push("urgent: today may be offered");
  else if (c.urgency === "soon") parts.push("urgent: from the next working day");
  if (c.earliestDate && c.latestDate) parts.push(`between ${shortDate(c.earliestDate)} and ${shortDate(c.latestDate)}`);
  else if (c.earliestDate) parts.push(`on or after ${shortDate(c.earliestDate)}`);
  else if (c.latestDate) parts.push(`on or before ${shortDate(c.latestDate)}`);
  if (c.avoidWeekdays.length) parts.push(`not ${c.avoidWeekdays.map((d) => WEEKDAY_NAMES[d] + "s").join(", ")}`);
  if (c.timeOfDay !== "any") parts.push(`${c.timeOfDay}s only`);
  if (c.notBeforeTime) parts.push(`not before ${c.notBeforeTime}`);
  if (c.notAfterTime) parts.push(`finish by ${c.notAfterTime}`);
  return parts;
}
