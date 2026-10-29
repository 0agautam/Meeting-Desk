import "server-only";
import { getBusyForStaff, hasCalendar } from "@/lib/calendar/access";
import type { Attendee, MeetingRequest, OfferedSlot, Staff } from "@/lib/types";
import { withoutOwnHolds } from "./holds";
import type { BusyInterval, PersonBusy } from "./slots";

/** True if the slot, with the person's buffer on both sides, doesn't touch any busy interval. */
export function slotIsFree(slot: OfferedSlot, busy: BusyInterval[], bufferMin: number): boolean {
  const start = Date.parse(slot.startUtc) - bufferMin * 60_000;
  const end = Date.parse(slot.endUtc) + bufferMin * 60_000;
  return !busy.some((b) => Date.parse(b.startTime) < end && Date.parse(b.endTime) > start);
}

/** True if the slot is free for every one of these people, each with their own buffer. */
export function slotIsFreeForAll(slot: OfferedSlot, people: PersonBusy[]): boolean {
  return people.every((p) => slotIsFree(slot, p.busy, p.bufferMin));
}

/**
 * Each person's busy time over the window, in the same order as `people`. Throws if a calendar can't be read.
 * Pass the request to leave out its own tentative holds (they must not block its own times).
 */
export async function busyForPeople(
  people: Staff[],
  opts: { startUtc: string; endUtc: string },
  request?: Pick<MeetingRequest, "id" | "offeredSlots">,
): Promise<PersonBusy[]> {
  return Promise.all(
    people.map(async (p) => {
      const busy = await getBusyForStaff(p.id, { ...opts, timeZone: p.timezone, workHours: p.workingHours });
      return { bufferMin: p.bufferMin, busy: request ? withoutOwnHolds(busy, request) : busy };
    }),
  );
}

/**
 * The calendars that count for a request: the host plus every invited attendee who is on the team (matched by
 * email). `outside` are attendees who aren't on the team (a CRM user without a Meeting Desk account), whose
 * calendar can't be read.
 */
export function calendarPeople(request: Pick<MeetingRequest, "attendees">, host: Staff, staff: Staff[]): { people: Staff[]; outside: Attendee[] } {
  const byEmail = new Map(staff.map((s) => [s.email.trim().toLowerCase(), s]));
  const people = [host];
  const outside: Attendee[] = [];
  for (const attendee of request.attendees) {
    const email = attendee.email.trim().toLowerCase();
    if (email === host.email.trim().toLowerCase()) continue;
    const member = byEmail.get(email);
    if (!member) outside.push(attendee);
    else if (!people.includes(member)) people.push(member);
  }
  return { people, outside };
}

/** The people whose calendar isn't connected (never connected, or the approval needs renewing). */
export async function withoutCalendar(people: Staff[]): Promise<Staff[]> {
  const connected = await Promise.all(people.map((p) => hasCalendar(p.id)));
  return people.filter((_, i) => !connected[i]);
}
