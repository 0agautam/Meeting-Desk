import type { Booking, OfferedSlot, SchedulingConstraints, Staff } from "@/lib/types";

/**
 * Slot generator. Always excludes this app's own Bookings (the double-booking
 * guard); optionally also excludes real calendar busy intervals when the caller
 * has them (docs/RESEARCH.md §9 — Zoho/Google free/busy, widened by the host's
 * buffer on both sides). Without real busy intervals this falls back to Phase 1's
 * working-hours-only behavior.
 */
export const DEFAULT_BOOKING_DURATION_MIN = 30;

/** A busy stretch on a calendar. eventId/title identify the calendar event when known (so our own holds can be told apart). */
export type BusyInterval = { startTime: string; endTime: string; eventId?: string; title?: string };

/** One person's calendar busy time and the buffer they want around it. */
/** A person's busy time and the buffer they keep free before a meeting starts and after it ends. */
export type PersonBusy = { bufferBeforeMin: number; bufferAfterMin: number; busy: BusyInterval[] };

/**
 * A busy stretch, widened by one person's buffers into the stretch a meeting may not touch: a meeting must start at least
 * `before` minutes after the busy time ends, and end at least `after` minutes before the next busy time starts.
 */
function widened(startMs: number, endMs: number, buffer: Pick<PersonBusy, "bufferBeforeMin" | "bufferAfterMin">): { start: number; end: number } {
  return { start: startMs - buffer.bufferAfterMin * 60_000, end: endMs + buffer.bufferBeforeMin * 60_000 };
}

/** What a calendar read needs: the window, and the person's time zone and working hours (a day off blocks those hours). */
export type BusyWindow = { startUtc: string; endUtc: string; timeZone: string; workHours: { start: string; end: string } };

/** A day off (an all-day event, dates YYYY-MM-DD, end exclusive) blocks the person's working hours on each of its days, nothing more. */
export function allDayBusy(startDate: string, endDate: string, person: Pick<BusyWindow, "timeZone" | "workHours">, meta: { eventId?: string; title?: string } = {}): BusyInterval[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const out: BusyInterval[] = [];
  for (let i = 0, day = startDate; i < 62 && (i === 0 || day < endDate); i++, day = dateToIso(new Date(Date.UTC(y, m - 1, d + i)))) {
    out.push({
      startTime: zonedTimeToUtc(day, person.workHours.start, person.timeZone).toISOString(),
      endTime: zonedTimeToUtc(day, person.workHours.end, person.timeZone).toISOString(),
      ...meta,
    });
  }
  return out;
}

/** The calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDayOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Converts a wall-clock time in `timeZone` to the equivalent UTC Date. */
export function zonedTimeToUtc(dateIso: string, hhmm: string, timeZone: string): Date {
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

/**
 * The host's working days ahead. Normally not today and not the next working day either ("tomorrow" for a
 * Friday is Monday), so the first day offered is the 2nd working day: Monday gives Wednesday, Friday gives
 * Tuesday. Urgency "soon" allows the next working day; "today" also allows today (if it is a working day).
 */
export function listAvailableDays(host: Staff, count = 14, opts: { urgency?: SchedulingConstraints["urgency"]; now?: Date } = {}): string[] {
  const urgency = opts.urgency ?? "normal";
  const [y, m, d] = localDayOf((opts.now ?? new Date()).toISOString(), host.timezone).split("-").map(Number);
  const days: string[] = [];
  let skip = urgency === "normal" ? 1 : 0;
  for (let i = urgency === "today" ? 0 : 1; days.length < count && i <= count * 3 + 2; i++) {
    const dayIso = dateToIso(new Date(Date.UTC(y, m - 1, d + i)));
    if (!host.workingHours.days.includes(weekdayOf(dayIso))) continue;
    if (skip > 0) {
      skip--;
      continue;
    }
    days.push(dayIso);
  }
  return days;
}

/** Slots for one day, stepped by duration + buffer, excluding times already booked. */
export function listDaySlots(
  host: Staff,
  dayIso: string,
  existingBookings: Booking[],
  durationMin = DEFAULT_BOOKING_DURATION_MIN,
  busyIntervals: BusyInterval[] = [],
): { startUtc: string; endUtc: string; label: string }[] {
  const step = durationMin + Math.max(host.bufferBeforeMin, host.bufferAfterMin);
  const [startH, startM] = host.workingHours.start.split(":").map(Number);
  const [endH, endM] = host.workingHours.end.split(":").map(Number);
  const dayStart = startH * 60 + startM;
  const dayEnd = endH * 60 + endM;
  const taken = new Set(existingBookings.filter((b) => b.status !== "failed").map((b) => b.startUtc));

  const widenedBusy = busyIntervals.map((b) => widened(new Date(b.startTime).getTime(), new Date(b.endTime).getTime(), host));

  const slots: { startUtc: string; endUtc: string; label: string }[] = [];
  for (let minutes = dayStart; minutes + durationMin <= dayEnd; minutes += step) {
    const hhmm = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const startUtc = zonedTimeToUtc(dayIso, hhmm, host.timezone);
    const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
    const startIso = startUtc.toISOString();
    if (taken.has(startIso)) continue;

    const startMs = startUtc.getTime();
    const endMs = endUtc.getTime();
    if (widenedBusy.some((b) => startMs < b.end && endMs > b.start)) continue;

    const label = new Intl.DateTimeFormat("en-US", { timeZone: host.timezone, hour: "numeric", minute: "2-digit" }).format(startUtc);
    slots.push({ startUtc: startIso, endUtc: endUtc.toISOString(), label });
  }
  return slots;
}

const SUGGEST_GRID_MIN = 30;

/** "14:30" → 870. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Day of the week (Sunday = 0) of a calendar date. */
function weekdayOf(dayIso: string): number {
  const [y, m, d] = dayIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Picks the times to offer a client (docs/RESEARCH.md §13): the earliest free slot on each of the
 * next working days that has one, `count` times in all (default 2: one day, then the next). A
 * slot is free if it sits inside the host's working hours, starts after the minimum notice, and doesn't
 * touch (within each person's own buffer) a busy interval on the host's calendar or an invited team
 * member's (`attendeeBusy`), or one of this app's own bookings. Candidates
 * are checked on a 30-minute grid, so a 45-minute meeting can start at 9:00, 9:30, 10:00…
 */
export function suggestSlots(
  host: Staff,
  opts: {
    durationMin: number;
    busy: BusyInterval[];
    /** The invited team members' calendars: the time must be free for them too. */
    attendeeBusy?: PersonBusy[];
    bookings: Booking[];
    count?: number;
    /** What the host's notes say about timing; days and times that break it are skipped. */
    constraints?: SchedulingConstraints;
    windowDays?: number;
    minNoticeHours?: number;
    now?: Date;
  },
): OfferedSlot[] {
  const { durationMin, count = 2, windowDays = 14, now = new Date(), constraints } = opts;
  const minNoticeHours = opts.minNoticeHours ?? (constraints?.urgency === "today" ? 2 : 4);
  const notBefore = constraints?.notBeforeTime ? toMinutes(constraints.notBeforeTime) : null;
  const notAfter = constraints?.notAfterTime ? toMinutes(constraints.notAfterTime) : null;
  const earliestStartMs = now.getTime() + minNoticeHours * 3_600_000;

  const blocked = [
    ...opts.busy.map((b) => ({ start: new Date(b.startTime).getTime(), end: new Date(b.endTime).getTime() })),
    ...opts.bookings
      .filter((b) => b.status !== "failed")
      .map((b) => ({ start: new Date(b.startUtc).getTime(), end: new Date(b.endUtc).getTime() })),
  ].map((b) => widened(b.start, b.end, host));
  for (const person of opts.attendeeBusy ?? []) {
    for (const b of person.busy) blocked.push(widened(new Date(b.startTime).getTime(), new Date(b.endTime).getTime(), person));
  }

  const [startH, startM] = host.workingHours.start.split(":").map(Number);
  const [endH, endM] = host.workingHours.end.split(":").map(Number);
  const dayStart = startH * 60 + startM;
  const dayEnd = endH * 60 + endM;

  const picked: OfferedSlot[] = [];
  for (const dayIso of listAvailableDays(host, windowDays, { urgency: constraints?.urgency, now })) {
    if (constraints?.earliestDate && dayIso < constraints.earliestDate) continue;
    if (constraints?.latestDate && dayIso > constraints.latestDate) continue;
    if (constraints?.avoidWeekdays.includes(weekdayOf(dayIso))) continue;
    const free: { startMs: number; slot: OfferedSlot }[] = [];
    for (let minutes = dayStart; minutes + durationMin <= dayEnd; minutes += SUGGEST_GRID_MIN) {
      if (constraints?.timeOfDay === "morning" && minutes >= 12 * 60) continue;
      if (constraints?.timeOfDay === "afternoon" && minutes < 12 * 60) continue;
      if (notBefore !== null && minutes < notBefore) continue;
      if (notAfter !== null && minutes + durationMin > notAfter) continue;
      const start = zonedTimeToUtc(dayIso, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`, host.timezone);
      const startMs = start.getTime();
      const endMs = startMs + durationMin * 60_000;
      if (startMs < earliestStartMs) continue;
      if (blocked.some((b) => startMs < b.end && endMs > b.start)) continue;
      free.push({ startMs, slot: { startUtc: start.toISOString(), endUtc: new Date(endMs).toISOString() } });
    }
    const first = free[0];
    if (!first) continue;
    picked.push(first.slot);
    if (picked.length >= count) break;
  }
  return picked.slice(0, count);
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
