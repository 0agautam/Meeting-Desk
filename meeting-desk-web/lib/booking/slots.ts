import type { Booking, Staff } from "@/lib/types";

/**
 * Phase 1 mock slot generator — no real calendar yet (see CLAUDE.md "Later phases").
 * Generates slots from the host's own working hours only; real free/busy merging
 * across Google/Zoho calendars is a later phase (docs/RESEARCH.md §9).
 */
export const DEFAULT_BOOKING_DURATION_MIN = 30;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Converts a wall-clock time in `timeZone` to the equivalent UTC Date. */
function zonedTimeToUtc(dateIso: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mi] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mi));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(guess)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(guess.getTime() - (asIfUtc - guess.getTime()));
}

function dateToIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Days ahead (starting tomorrow) that fall on one of the host's working days. */
export function listAvailableDays(host: Staff, count = 14): string[] {
  const days: string[] = [];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  for (let i = 0; days.length < count && i < count * 3; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    if (host.workingHours.days.includes(d.getUTCDay())) days.push(dateToIso(d));
  }
  return days;
}

/** Slots for one day, stepped by duration + buffer, excluding times already booked. */
export function listDaySlots(
  host: Staff,
  dayIso: string,
  existingBookings: Booking[],
  durationMin = DEFAULT_BOOKING_DURATION_MIN,
): { startUtc: string; endUtc: string; label: string }[] {
  const step = durationMin + host.bufferMin;
  const [startH, startM] = host.workingHours.start.split(":").map(Number);
  const [endH, endM] = host.workingHours.end.split(":").map(Number);
  const dayStart = startH * 60 + startM;
  const dayEnd = endH * 60 + endM;
  const taken = new Set(existingBookings.filter((b) => b.status !== "failed").map((b) => b.startUtc));

  const slots: { startUtc: string; endUtc: string; label: string }[] = [];
  for (let minutes = dayStart; minutes + durationMin <= dayEnd; minutes += step) {
    const hhmm = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const startUtc = zonedTimeToUtc(dayIso, hhmm, host.timezone);
    const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
    const startIso = startUtc.toISOString();
    if (taken.has(startIso)) continue;

    const label = new Intl.DateTimeFormat("en-US", { timeZone: host.timezone, hour: "numeric", minute: "2-digit" }).format(startUtc);
    slots.push({ startUtc: startIso, endUtc: endUtc.toISOString(), label });
  }
  return slots;
}

export function formatDayLabel(dayIso: string, timeZone: string): string {
  const [y, m, d] = dayIso.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(noonUtc);
}

export function formatShortDayLabel(dayIso: string, timeZone: string): { weekday: string; day: string } {
  const [y, m, d] = dayIso.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noonUtc),
    day: new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(noonUtc),
  };
}
