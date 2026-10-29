import "server-only";
import type {
  Attendee,
  EmailDraft,
  FieldChange,
  SchedulingConstraints,
  MeetingRequest,
  OfferedSlot,
  RequestEvent,
  RequestStatus,
} from "@/lib/types";
import { tryGetCatalystApp } from "./catalystApp";
import { parseConstraints } from "@/lib/booking/constraints";
import { parseDataStoreTime, parseJsonColumn, zcqlLiteral } from "./dsHelpers";
import { getStore, newId } from "./store";

/**
 * Meeting requests and their history, backed by the real Data Store tables
 * "MeetingRequests" and "RequestEvents" (created Sep 28, 2026) once deployed, so
 * they survive restarts and AppSail's multiple instances. Falls back to the Phase 1
 * in-memory store when not on Catalyst (local `next dev`), like staffStore.ts.
 * createdAt/updatedAt/at come from Data Store's own CREATEDTIME/MODIFIEDTIME.
 */

const REQUESTS = "MeetingRequests";
const EVENTS = "RequestEvents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function rowToRequest(row: Row): MeetingRequest {
  return {
    id: String(row.ROWID),
    hostId: String(row.host_id),
    subject: String(row.subject),
    to: parseJsonColumn<string[]>(row.to_emails, []),
    cc: parseJsonColumn<string[]>(row.cc_emails, []),
    // Requests saved before attendees came from the CRM hold staff ids and no email; those entries are skipped.
    attendees: parseJsonColumn<Partial<Attendee>[]>(row.attendees, []).filter((a): a is Attendee => typeof a.email === "string" && typeof a.name === "string"),
    durationMin: Number(row.duration_min),
    notes: row.notes ? String(row.notes) : "",
    status: row.status as RequestStatus,
    version: Number(row.version),
    crmAccount: row.crm_account ? String(row.crm_account) : undefined,
    offeredSlots: parseJsonColumn<OfferedSlot[]>(row.offered_slots, []),
    emailDraft: parseJsonColumn<EmailDraft | undefined>(row.email_draft, undefined),
    constraints: row.scheduling_constraints ? parseConstraints(parseJsonColumn<unknown>(row.scheduling_constraints, null)) : undefined,
    createdAt: parseDataStoreTime(row.CREATEDTIME),
    updatedAt: parseDataStoreTime(row.MODIFIEDTIME),
  };
}

function rowToEvent(row: Row): RequestEvent {
  return {
    id: String(row.ROWID),
    requestId: String(row.request_id),
    type: row.type,
    actorId: String(row.actor_id),
    message: row.message ? String(row.message) : undefined,
    changes: row.changes ? parseJsonColumn<Record<string, FieldChange>>(row.changes, {}) : undefined,
    version: Number(row.version),
    at: parseDataStoreTime(row.CREATEDTIME),
  };
}

export type NewRequestInput = {
  hostId: string;
  subject: string;
  to: string[];
  cc: string[];
  attendees: Attendee[];
  durationMin: number;
  notes: string;
  crmAccount?: string;
};

// ── Requests ─────────────────────────────────────────────────────────────
export async function listRequestsFromStore(
  filter: { hostId?: string; status?: RequestStatus } = {},
): Promise<MeetingRequest[]> {
  const app = await tryGetCatalystApp();
  let requests: MeetingRequest[];
  if (!app) {
    requests = getStore()
      .requests.filter((r) => (filter.hostId ? r.hostId === filter.hostId : true))
      .filter((r) => (filter.status ? r.status === filter.status : true));
  } else {
    const where = [
      filter.hostId ? `host_id = ${zcqlLiteral(filter.hostId)}` : null,
      filter.status ? `status = ${zcqlLiteral(filter.status)}` : null,
    ].filter(Boolean);
    const rows = await app
      .zcql()
      .executeZCQLQuery(`SELECT * FROM ${REQUESTS}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`);
    requests = rows.map((r) => rowToRequest(r[REQUESTS]));
  }
  return requests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRequestFromStore(id: string): Promise<MeetingRequest | undefined> {
  const app = await tryGetCatalystApp();
  if (!app) return getStore().requests.find((r) => r.id === id);
  try {
    return rowToRequest(await app.datastore().table(REQUESTS).getRow(id));
  } catch {
    return undefined;
  }
}

export async function createRequestInStore(input: NewRequestInput): Promise<MeetingRequest> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const now = new Date().toISOString();
    const request: MeetingRequest = { ...input, id: newId("req"), status: "new", version: 1, offeredSlots: [], createdAt: now, updatedAt: now };
    getStore().requests.push(request);
    return request;
  }
  const row = await app
    .datastore()
    .table(REQUESTS)
    .insertRow({
      host_id: input.hostId,
      subject: input.subject,
      to_emails: JSON.stringify(input.to),
      cc_emails: JSON.stringify(input.cc),
      attendees: JSON.stringify(input.attendees),
      duration_min: input.durationMin,
      status: "new",
      version: 1,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.crmAccount ? { crm_account: input.crmAccount } : {}),
    });
  return rowToRequest(row);
}

/** Host resubmit: apply edited fields, bump the version, status → "updated". Returns only the fields that changed. */
export async function updateRequestFieldsInStore(
  id: string,
  patch: Partial<Pick<MeetingRequest, "to" | "cc" | "durationMin" | "subject" | "notes" | "attendees" | "crmAccount">>,
): Promise<{ request: MeetingRequest; changes: Record<string, FieldChange> }> {
  const current = await getRequestFromStore(id);
  if (!current) throw new Error(`Request not found: ${id}`);

  const changes: Record<string, FieldChange> = {};
  for (const key of ["subject", "notes", "to", "cc", "durationMin"] as const) {
    if (key in patch) {
      const from = current[key];
      const to = patch[key]!;
      if (JSON.stringify(from) !== JSON.stringify(to)) changes[key] = { from, to };
    }
  }

  // Attendees are compared by email and shown by name.
  if (patch.attendees) {
    const emails = (list: Attendee[]) => list.map((x) => x.email.toLowerCase()).sort().join("|");
    if (emails(current.attendees) !== emails(patch.attendees)) {
      changes.attendees = { from: current.attendees.map((x) => x.name), to: patch.attendees.map((x) => x.name) };
    }
  }

  const app = await tryGetCatalystApp();
  if (!app) {
    const request = getStore().requests.find((r) => r.id === id)!;
    Object.assign(request, patch, { crmAccount: patch.crmAccount || undefined }, { status: "updated" as const, version: request.version + 1, offeredSlots: [], emailDraft: undefined, constraints: undefined, updatedAt: new Date().toISOString() });
    return { request, changes };
  }
  const row = await app
    .datastore()
    .table(REQUESTS)
    .updateRow({
      ROWID: id,
      status: "updated",
      version: current.version + 1,
      offered_slots: "[]", // the edited request needs a fresh email, so the old offered times and email are dropped
      email_draft: "",
      scheduling_constraints: "", // the notes may have changed, so they are read again
      ...(patch.subject ? { subject: patch.subject } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.to ? { to_emails: JSON.stringify(patch.to) } : {}),
      ...(patch.cc ? { cc_emails: JSON.stringify(patch.cc) } : {}),
      ...(patch.attendees ? { attendees: JSON.stringify(patch.attendees) } : {}),
      ...(patch.crmAccount !== undefined ? { crm_account: patch.crmAccount } : {}),
      ...(patch.durationMin ? { duration_min: patch.durationMin } : {}),
    });
  return { request: rowToRequest(row), changes };
}

/** The coordinator's status-only transitions — no version bump. */
export async function setRequestStatusInStore(id: string, status: RequestStatus): Promise<MeetingRequest> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const request = getStore().requests.find((r) => r.id === id);
    if (!request) throw new Error(`Request not found: ${id}`);
    request.status = status;
    request.updatedAt = new Date().toISOString();
    return request;
  }
  return rowToRequest(await app.datastore().table(REQUESTS).updateRow({ ROWID: id, status }));
}

/** Saves the times generated for the client's email (empty array clears them). */
export async function setOfferedSlotsInStore(id: string, slots: OfferedSlot[]): Promise<MeetingRequest> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const request = getStore().requests.find((r) => r.id === id);
    if (!request) throw new Error(`Request not found: ${id}`);
    request.offeredSlots = slots;
    return request;
  }
  return rowToRequest(await app.datastore().table(REQUESTS).updateRow({ ROWID: id, offered_slots: JSON.stringify(slots) }));
}

/** Saves what the notes say about timing (null clears it, so the notes are read again next time). */
export async function setConstraintsInStore(id: string, constraints: SchedulingConstraints | null): Promise<MeetingRequest> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const request = getStore().requests.find((r) => r.id === id);
    if (!request) throw new Error(`Request not found: ${id}`);
    request.constraints = constraints ?? undefined;
    return request;
  }
  return rowToRequest(
    await app.datastore().table(REQUESTS).updateRow({ ROWID: id, scheduling_constraints: constraints ? JSON.stringify(constraints) : "" }),
  );
}

/** Saves the client email as the coordinator last edited it (null clears it). */
export async function setEmailDraftInStore(id: string, draft: EmailDraft | null): Promise<MeetingRequest> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const request = getStore().requests.find((r) => r.id === id);
    if (!request) throw new Error(`Request not found: ${id}`);
    request.emailDraft = draft ?? undefined;
    return request;
  }
  return rowToRequest(await app.datastore().table(REQUESTS).updateRow({ ROWID: id, email_draft: draft ? JSON.stringify(draft) : "" }));
}

// ── History ──────────────────────────────────────────────────────────────
export async function listEventsFromStore(requestId: string): Promise<RequestEvent[]> {
  const app = await tryGetCatalystApp();
  let events: RequestEvent[];
  if (!app) {
    events = getStore().events.filter((e) => e.requestId === requestId);
  } else {
    const rows = await app.zcql().executeZCQLQuery(`SELECT * FROM ${EVENTS} WHERE request_id = ${zcqlLiteral(requestId)}`);
    events = rows.map((r) => rowToEvent(r[EVENTS]));
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export async function addEventToStore(event: Omit<RequestEvent, "id" | "at">): Promise<RequestEvent> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const created: RequestEvent = { ...event, id: newId("evt"), at: new Date().toISOString() };
    getStore().events.push(created);
    return created;
  }
  const row = await app
    .datastore()
    .table(EVENTS)
    .insertRow({
      request_id: event.requestId,
      type: event.type,
      actor_id: event.actorId,
      version: event.version,
      ...(event.message ? { message: event.message } : {}),
      ...(event.changes ? { changes: JSON.stringify(event.changes) } : {}),
    });
  return rowToEvent(row);
}
