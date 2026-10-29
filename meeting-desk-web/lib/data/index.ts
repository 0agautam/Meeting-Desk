import "server-only";

import type { Booking, EmailDraft, FieldChange, SchedulingConstraints, MeetingRequest, OfferedSlot, RequestEvent, RequestStatus, Staff, StaffRole } from "@/lib/types";
import { busyForPeople, calendarPeople, slotIsFreeForAll } from "@/lib/booking/availability";
import { releaseHolds, stripHolds } from "@/lib/booking/holds";
import { getOrgSettings, withOrgSettings } from "@/lib/org/settings";
import { createCalendarEvent } from "@/lib/calendar/access";
import {
  deleteBookingsForHostFromStore,
  getBookingFromStore,
  insertBookingInStore,
  listBookingsFromStore,
  SlotTakenError,
  updateBookingInStore,
} from "./bookingStore";
import {
  addEventToStore,
  createRequestInStore,
  deleteEventsForRequestsFromStore,
  deleteRequestsFromStore,
  getRequestFromStore,
  listEventsFromStore,
  listRequestsFromStore,
  setConstraintsInStore,
  setEmailDraftInStore,
  setOfferedSlotsInStore,
  setRequestStatusInStore,
  updateRequestFieldsInStore,
  type NewRequestInput,
} from "./requestStore";
import {
  createStaffInStore,
  deleteStaffInStore,
  getStaffByEmailFromStore,
  getStaffBySlugFromStore,
  getStaffFromStore,
  listStaffFromStore,
  updateStaffInStore,
} from "./staffStore";
import { getStore, newId, type RequestDraft } from "./store";

/**
 * Repository layer. Every page and action reads/writes through these functions.
 * Later phases swap the bodies for Data Store / Zoho / calendar calls —
 * the signatures (and therefore the pages) stay the same.
 */

// ── Staff (real Data Store once deployed, mock fallback locally — see staffStore.ts) ──
// The time zone and working hours are the organisation's (Settings, first fetched from the CRM), applied to everyone here.
export async function listStaff(): Promise<Staff[]> {
  const [staff, org] = await Promise.all([listStaffFromStore(), getOrgSettings()]);
  return staff.map((s) => withOrgSettings(s, org));
}

export async function getStaff(id: string): Promise<Staff | undefined> {
  const [staff, org] = await Promise.all([getStaffFromStore(id), getOrgSettings()]);
  return staff && withOrgSettings(staff, org);
}

export async function getStaffByEmail(email: string): Promise<Staff | undefined> {
  const [staff, org] = await Promise.all([getStaffByEmailFromStore(email), getOrgSettings()]);
  return staff && withOrgSettings(staff, org);
}

export async function getStaffBySlug(slug: string): Promise<Staff | undefined> {
  const [staff, org] = await Promise.all([getStaffBySlugFromStore(slug), getOrgSettings()]);
  return staff && withOrgSettings(staff, org);
}

export async function updateStaff(
  id: string,
  patch: Partial<Pick<Staff, "calendarProvider" | "bufferBeforeMin" | "bufferAfterMin" | "roles">>,
): Promise<Staff> {
  return withOrgSettings(await updateStaffInStore(id, patch), await getOrgSettings());
}

export async function createStaff(input: {
  name: string;
  email: string;
  roles: StaffRole[];
  calendarProvider: Staff["calendarProvider"];
  bufferBeforeMin: number;
  bufferAfterMin: number;
}): Promise<Staff> {
  return withOrgSettings(await createStaffInStore(input), await getOrgSettings());
}

export async function deleteStaff(id: string): Promise<void> {
  return deleteStaffInStore(id);
}

/**
 * Everything that would be lost if a host were deleted together with their data: how many meeting requests and
 * booking records they have (shown in the warning before an admin confirms).
 */
export async function countHostData(hostId: string): Promise<{ requests: number; bookings: number }> {
  const [requests, bookings] = await Promise.all([listRequestsFromStore({ hostId }), listBookingsFromStore(hostId)]);
  return { requests: requests.length, bookings: bookings.length };
}

/**
 * Permanently deletes a host's meeting requests, their history and their booking records. The grey tentative holds are taken off
 * the calendars first (host's and invited teammates'; best effort), so no stray events are left. Meetings that were already booked
 * stay in the calendars: only the app's records of them are removed. Call this BEFORE the person's calendar approval is revoked.
 */
export async function deleteHostData(hostId: string): Promise<{ requests: number; events: number; bookings: number }> {
  let requests = 0;
  let events = 0;
  // A query returns a limited number of rows, so work in rounds until nothing is left (capped, so it can't loop forever).
  for (let round = 0; round < 50; round++) {
    const batch = await listRequestsFromStore({ hostId });
    if (batch.length === 0) break;
    for (const request of batch) {
      if (request.offeredSlots.length > 0) await releaseHolds(hostId, request.offeredSlots);
    }
    const ids = batch.map((r) => r.id);
    events += await deleteEventsForRequestsFromStore(ids);
    await deleteRequestsFromStore(ids);
    requests += batch.length;
  }
  const bookings = await deleteBookingsForHostFromStore(hostId);
  return { requests, events, bookings };
}

// ── Requests (real Data Store once deployed, in-memory fallback locally — see requestStore.ts) ──
export async function listRequests(filter: { hostId?: string; status?: RequestStatus } = {}): Promise<MeetingRequest[]> {
  return listRequestsFromStore(filter);
}

export async function getRequest(id: string): Promise<MeetingRequest | undefined> {
  return getRequestFromStore(id);
}

/**
 * Host resubmit (wireframe 2): apply edited fields, bump the version, move the
 * request back to "updated" (the coordinator's turn). Returns only the fields that
 * actually changed, for the RequestEvent's `changes` diff.
 */
export async function updateRequestFields(
  id: string,
  patch: Partial<Pick<MeetingRequest, "to" | "cc" | "durationMin" | "subject" | "notes" | "attendees" | "crmAccount">>,
): Promise<{ request: MeetingRequest; changes: Record<string, FieldChange> }> {
  return updateRequestFieldsInStore(id, patch);
}

export async function createRequest(input: NewRequestInput): Promise<MeetingRequest> {
  return createRequestInStore(input);
}

export async function setOfferedSlots(id: string, slots: OfferedSlot[]): Promise<MeetingRequest> {
  return setOfferedSlotsInStore(id, slots);
}

export async function setConstraints(id: string, constraints: SchedulingConstraints | null): Promise<MeetingRequest> {
  return setConstraintsInStore(id, constraints);
}

export async function setEmailDraft(id: string, draft: EmailDraft | null): Promise<MeetingRequest> {
  return setEmailDraftInStore(id, draft);
}

/** The coordinator's status-only transitions (ask for info, mark as sent) — no version bump. */
export async function setRequestStatus(id: string, status: RequestStatus): Promise<MeetingRequest> {
  return setRequestStatusInStore(id, status);
}

// ── Drafts (wireframe 1's unsubmitted request card; not a MeetingRequest) ──
export async function getDraft(hostId: string): Promise<RequestDraft | undefined> {
  return getStore().drafts[hostId];
}

export async function saveDraft(hostId: string, subject: string): Promise<RequestDraft> {
  const draft: RequestDraft = { hostId, subject, savedAt: new Date().toISOString() };
  getStore().drafts[hostId] = draft;
  return draft;
}

export async function clearDraft(hostId: string): Promise<void> {
  delete getStore().drafts[hostId];
}

// ── History (see requestStore.ts) ────────────────────────────────────────
export async function listEvents(requestId: string): Promise<RequestEvent[]> {
  return listEventsFromStore(requestId);
}

export async function addEvent(event: Omit<RequestEvent, "id" | "at">): Promise<RequestEvent> {
  return addEventToStore(event);
}

// ── Bookings (real Data Store once deployed — see bookingStore.ts) ───────────
export async function listBookings(hostId?: string): Promise<Booking[]> {
  return listBookingsFromStore(hostId);
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  return getBookingFromStore(id);
}

const CALENDAR_DOWN_REASON = "The host's calendar isn't responding right now. Try again in a few minutes.";

/**
 * Books a time (docs/RESEARCH.md §8): save the booking as pending under the unique slot key
 * (a second client picking the same time is refused here), re-check that the time is still
 * free (the host's calendar, plus our own bookings, with the host's
 * buffer), create the real calendar event with the guests invited, then mark it booked. Any
 * failure after the first step frees the slot again and keeps a failed row the client's
 * "we couldn't book that" screen can point at.
 */
export async function createBooking(
  input: Omit<Booking, "id" | "status" | "slotKey">,
): Promise<
  | { ok: true; booking: Booking }
  | { ok: false; reason: "slot_taken" | "calendar_error"; booking: Booking }
> {
  const slotKey = `${input.hostId}|${input.startUtc}`;

  let booking: Booking;
  try {
    booking = await insertBookingInStore({ ...input, status: "pending", slotKey });
  } catch (err) {
    if (!(err instanceof SlotTakenError)) throw err;
    const failed = await insertBookingInStore({
      ...input,
      status: "failed",
      failureReason: "That time was just taken.",
      slotKey: `${slotKey}|failed|${newId("taken")}`,
    });
    return { ok: false, reason: "slot_taken", booking: failed };
  }

  const release = (reason: string) =>
    updateBookingInStore(booking.id, { status: "failed", failureReason: reason, slotKey: `${slotKey}|failed|${booking.id}` });

  const [host, request, bookings] = await Promise.all([
    getStaff(input.hostId),
    input.requestId ? getRequestFromStore(input.requestId) : undefined,
    listBookingsFromStore(input.hostId),
  ]);
  if (!host) {
    console.warn(`createBooking: host ${input.hostId} not found`);
    return { ok: false, reason: "calendar_error", booking: await release(CALENDAR_DOWN_REASON) };
  }

  // Still free? The host's calendar and every invited team member's, plus our own other bookings for this host.
  const slot = { startUtc: input.startUtc, endUtc: input.endUtc };
  try {
    const pad = 2 * 3_600_000;
    const checked = request ? calendarPeople(request, host, await listStaff()).checked : [host];
    // This request's own grey holds sit on the calendars at the offered times; they mustn't block the booking.
    // Only the host and the required attendees are checked; optional ones are invited but never block.
    const [hostBusy, ...attendeeBusy] = await busyForPeople(
      checked,
      {
        startUtc: new Date(Date.parse(input.startUtc) - pad).toISOString(),
        endUtc: new Date(Date.parse(input.endUtc) + pad).toISOString(),
      },
      request,
    );
    const ownBusy = bookings
      .filter((b) => b.id !== booking.id && b.status !== "failed")
      .map((b) => ({ startTime: b.startUtc, endTime: b.endUtc }));
    if (!slotIsFreeForAll(slot, [{ bufferBeforeMin: hostBusy.bufferBeforeMin, bufferAfterMin: hostBusy.bufferAfterMin, busy: [...hostBusy.busy, ...ownBusy] }, ...attendeeBusy])) {
      return { ok: false, reason: "slot_taken", booking: await release("That time is no longer available.") };
    }
  } catch (err) {
    console.warn(`createBooking: couldn't re-check availability for host ${input.hostId}:`, err);
    return { ok: false, reason: "calendar_error", booking: await release(CALENDAR_DOWN_REASON) };
  }

  // Real calendar event in the host's own connected calendar, with the client and ABR
  // attendees invited. A host with no calendar connected → no event.
  try {
    const guests = new Set(
      [
        input.clientEmail,
        ...(request?.cc ?? []),
        ...(request?.attendees ?? []).map((a) => a.email),
      ].map((e) => e.trim().toLowerCase()),
    );
    guests.delete(host.email.toLowerCase());
    const event = await createCalendarEvent(host.id, {
      title: request?.subject ?? "Meeting",
      startUtc: input.startUtc,
      endUtc: input.endUtc,
      timezone: host.timezone,
      description: [
        `Booked by ${input.clientName} (${input.clientEmail})${input.company ? `, ${input.company}` : ""}.`,
        input.notes ? `Notes from the client: ${input.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      attendeeEmails: [...guests],
    });
    booking = await updateBookingInStore(booking.id, {
      status: "booked",
      providerEventId: event?.eventId,
      providerEventEtag: event?.etag,
    });
    // The meeting is booked: take this request's tentative holds off the host's calendar (best effort, never fails the booking).
    if (request) {
      try {
        await releaseHolds(host.id, request.offeredSlots);
        await setOfferedSlotsInStore(request.id, stripHolds(request.offeredSlots));
      } catch (err) {
        console.warn(`createBooking: couldn't clear tentative holds for request ${request.id}:`, err);
      }
    }
    return { ok: true, booking };
  } catch (err) {
    console.warn(`createBooking: calendar event creation failed for host ${input.hostId}:`, err);
    return { ok: false, reason: "calendar_error", booking: await release(CALENDAR_DOWN_REASON) };
  }
}
