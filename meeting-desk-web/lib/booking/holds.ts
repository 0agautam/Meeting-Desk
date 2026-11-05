import "server-only";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/calendar/access";
import type { MeetingRequest, OfferedSlot, Staff } from "@/lib/types";
import type { BusyInterval } from "./slots";

/**
 * Tentative holds: when times are offered to a client, each one is put on the host's calendar as a
 * grey "Tentative: <topic> — <client>" event, so the host (and anyone looking at that calendar) sees
 * the time is spoken for and doesn't offer it to someone else. The invited team members get the same hold
 * on their own calendars, so they aren't offered to someone else either. The holds are removed when the client
 * books through the link (the booked time becomes the real event), when the times are regenerated or
 * the host resubmits the request, or by hand ("Release holds" on the desk, or deleting them in the
 * calendar if the meeting was arranged outside the app).
 */

const HOLD_COLOR = "#8c8c8c";
const HOLD_PREFIX = "Tentative: ";

/** Short tag at the end of a hold's title, so a hold can be recognised as this request's even if its event id doesn't match. */
const marker = (request: Pick<MeetingRequest, "id">) => `(#${request.id.slice(-6)})`;

export function holdTitle(request: Pick<MeetingRequest, "id" | "subject" | "crmAccount" | "to">): string {
  return `${HOLD_PREFIX}${request.subject} — ${request.crmAccount ?? request.to[0] ?? "client"} ${marker(request)}`;
}

/** True if this busy stretch is one of the request's own holds (which must not block the request's own times). */
export function isOwnHold(busy: BusyInterval, request: Pick<MeetingRequest, "id" | "offeredSlots">): boolean {
  if (busy.eventId && request.offeredSlots.some((s) => s.holdEventId === busy.eventId || s.attendeeHolds?.some((h) => h.eventId === busy.eventId))) return true;
  return !!busy.title && busy.title.startsWith(HOLD_PREFIX) && busy.title.endsWith(marker(request));
}

export function withoutOwnHolds(busy: BusyInterval[], request: Pick<MeetingRequest, "id" | "offeredSlots">): BusyInterval[] {
  return busy.filter((b) => !isOwnHold(b, request));
}

/** The slots without their hold ids (after the holds are gone). */
export function stripHolds(slots: OfferedSlot[]): OfferedSlot[] {
  return slots.map(({ startUtc, endUtc }) => ({ startUtc, endUtc }));
}

/** Puts a grey hold on the host's calendar and on each invited team member's for every slot. If one fails, the ones already placed are removed and the error is thrown. */
export async function placeHolds(
  host: Pick<Staff, "id" | "timezone">,
  attendees: Pick<Staff, "id" | "timezone">[],
  request: Pick<MeetingRequest, "id" | "subject" | "crmAccount" | "to">,
  slots: OfferedSlot[],
): Promise<OfferedSlot[]> {
  const placed: OfferedSlot[] = [];
  const hold = (person: Pick<Staff, "id" | "timezone">, slot: OfferedSlot) =>
    createCalendarEvent(person.id, {
      title: holdTitle(request),
      startUtc: slot.startUtc,
      endUtc: slot.endUtc,
      timezone: person.timezone,
      color: HOLD_COLOR,
      description: "Held by Meeting Requests while the client picks a time. It is removed when the coordinator marks the meeting as booked. If the meeting is arranged another way, delete this event.",
    });
  try {
    for (const slot of slots) {
      // Recorded before the events are made, so a failure part-way still cleans up what exists.
      const entry: OfferedSlot = { ...slot, attendeeHolds: [] };
      placed.push(entry);
      const event = await hold(host, slot);
      if (event) entry.holdEventId = event.eventId;
      for (const person of attendees) {
        const attendeeEvent = await hold(person, slot);
        if (attendeeEvent) entry.attendeeHolds!.push({ staffId: person.id, eventId: attendeeEvent.eventId });
      }
      if (entry.attendeeHolds!.length === 0) delete entry.attendeeHolds;
    }
  } catch (err) {
    await releaseHolds(host.id, placed);
    throw err;
  }
  return placed;
}

/** Removes the holds from the host's calendar and the invited team members'. Best effort (a hold already deleted by hand is fine); returns how many couldn't be removed. */
export async function releaseHolds(hostId: string, slots: OfferedSlot[]): Promise<number> {
  let failed = 0;
  for (const slot of slots) {
    const holds = [...(slot.holdEventId ? [{ staffId: hostId, eventId: slot.holdEventId }] : []), ...(slot.attendeeHolds ?? [])];
    for (const hold of holds) {
      try {
        await deleteCalendarEvent(hold.staffId, { eventId: hold.eventId });
      } catch (err) {
        failed++;
        console.warn(`releaseHolds: couldn't remove hold ${hold.eventId} from calendar of ${hold.staffId}:`, err);
      }
    }
  }
  return failed;
}
