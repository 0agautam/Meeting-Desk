import "server-only";

import type { Attendee, Booking, FieldChange, MeetingRequest, RequestEvent, RequestStatus, Staff } from "@/lib/types";
import { getStore, newId, type RequestDraft } from "./store";

/**
 * Repository layer. Every page and action reads/writes through these functions.
 * Later phases swap the bodies for Data Store / Zoho / calendar calls —
 * the signatures (and therefore the pages) stay the same.
 */

// ── Staff ────────────────────────────────────────────────────────────────
export async function listStaff(): Promise<Staff[]> {
  return getStore().staff;
}

export async function getStaff(id: string): Promise<Staff | undefined> {
  return getStore().staff.find((s) => s.id === id);
}

export async function getStaffBySlug(slug: string): Promise<Staff | undefined> {
  return getStore().staff.find((s) => s.slug === slug);
}

export async function updateStaff(
  id: string,
  patch: Partial<Pick<Staff, "calendarProvider" | "bufferMin">>,
): Promise<Staff> {
  const staff = getStore().staff.find((s) => s.id === id);
  if (!staff) throw new Error(`Staff not found: ${id}`);
  Object.assign(staff, patch);
  return staff;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createStaff(input: {
  name: string;
  email: string;
  calendarProvider: Staff["calendarProvider"];
  bufferMin: number;
}): Promise<Staff> {
  const store = getStore();
  let slug = slugify(input.name) || "host";
  let n = 2;
  while (store.staff.some((s) => s.slug === slug)) slug = `${slugify(input.name)}-${n++}`;

  const staff: Staff = {
    id: newId("stf"),
    name: input.name,
    email: input.email,
    role: "host",
    calendarProvider: input.calendarProvider,
    bufferMin: input.bufferMin,
    workingHours: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
    timezone: "America/Toronto",
    slug,
  };
  store.staff.push(staff);
  return staff;
}

// ── Requests ─────────────────────────────────────────────────────────────
export async function listRequests(filter: { hostId?: string; status?: RequestStatus } = {}): Promise<MeetingRequest[]> {
  return getStore()
    .requests.filter((r) => (filter.hostId ? r.hostId === filter.hostId : true))
    .filter((r) => (filter.status ? r.status === filter.status : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRequest(id: string): Promise<MeetingRequest | undefined> {
  return getStore().requests.find((r) => r.id === id);
}

/**
 * Host resubmit (wireframe 2): apply edited fields, bump the version, move the
 * request back to "updated" (Celian's turn). Returns only the fields that
 * actually changed, for the RequestEvent's `changes` diff.
 */
export async function updateRequestFields(
  id: string,
  patch: Partial<Pick<MeetingRequest, "to" | "cc" | "durationMin">>,
): Promise<{ request: MeetingRequest; changes: Record<string, FieldChange> }> {
  const request = getStore().requests.find((r) => r.id === id);
  if (!request) throw new Error(`Request not found: ${id}`);

  const changes: Record<string, FieldChange> = {};
  for (const key of ["to", "cc", "durationMin"] as const) {
    if (key in patch) {
      const from = request[key];
      const to = patch[key]!;
      if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
    }
  }

  Object.assign(request, patch, {
    status: "updated" as const,
    version: request.version + 1,
    updatedAt: new Date().toISOString(),
  });

  return { request, changes };
}

export async function createRequest(input: {
  hostId: string;
  subject: string;
  to: string[];
  cc: string[];
  attendees: Attendee[];
  durationMin: number;
  notes: string;
  crmAccount?: string;
}): Promise<MeetingRequest> {
  const now = new Date().toISOString();
  const request: MeetingRequest = { ...input, id: newId("req"), status: "new", version: 1, createdAt: now, updatedAt: now };
  getStore().requests.push(request);
  return request;
}

/** Celian's status-only transitions (ask for info, mark as sent) — no version bump. */
export async function setRequestStatus(id: string, status: RequestStatus): Promise<MeetingRequest> {
  const request = getStore().requests.find((r) => r.id === id);
  if (!request) throw new Error(`Request not found: ${id}`);
  request.status = status;
  request.updatedAt = new Date().toISOString();
  return request;
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

// ── History ──────────────────────────────────────────────────────────────
export async function listEvents(requestId: string): Promise<RequestEvent[]> {
  return getStore()
    .events.filter((e) => e.requestId === requestId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function addEvent(event: Omit<RequestEvent, "id" | "at">): Promise<RequestEvent> {
  const created: RequestEvent = { ...event, id: newId("evt"), at: new Date().toISOString() };
  getStore().events.push(created);
  return created;
}

// ── Bookings ─────────────────────────────────────────────────────────────
export async function listBookings(hostId?: string): Promise<Booking[]> {
  return getStore().bookings.filter((b) => (hostId ? b.hostId === hostId : true));
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  return getStore().bookings.find((b) => b.id === id);
}

export async function createBooking(
  input: Omit<Booking, "id" | "status" | "slotKey">,
): Promise<{ ok: true; booking: Booking } | { ok: false; reason: "slot_taken"; booking: Booking }> {
  const store = getStore();
  const slotKey = `${input.hostId}|${input.startUtc}`;
  // Mirrors the Data Store unique constraint on slot_key (RESEARCH.md §6).
  if (store.bookings.some((b) => b.slotKey === slotKey && b.status !== "failed")) {
    // Rewrite the key so the slot frees up again (RESEARCH.md §6) while keeping a
    // referenceable failed row for the client's "we couldn't book that" screen.
    const id = newId("bkg");
    const failed: Booking = {
      ...input,
      id,
      status: "failed",
      failureReason: "That time was just taken.",
      slotKey: `${slotKey}|failed|${id}`,
    };
    store.bookings.push(failed);
    return { ok: false, reason: "slot_taken", booking: failed };
  }
  const booking: Booking = { ...input, id: newId("bkg"), status: "booked", slotKey };
  store.bookings.push(booking);
  return { ok: true, booking };
}
