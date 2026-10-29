import "server-only";
import type { Booking, BookingStatus } from "@/lib/types";
import { tryGetCatalystApp } from "./catalystApp";
import { deleteRowsInBatches, formatDataStoreTime, parseDataStoreTime, zcqlLiteral } from "./dsHelpers";
import { getStore, newId } from "./store";

/**
 * Bookings in the Data Store table "Bookings" (request_id, host_id, start_utc/end_utc
 * [DateTime], client_name, client_email, company, notes, status, failure_reason,
 * provider_event_id, provider_event_etag, slot_key [unique]) once deployed, so a booking
 * survives restarts and AppSail's multiple instances. Falls back to memory off Catalyst.
 * The unique slot_key is the double-booking guard: a second insert for the same
 * `hostId|startUtc` is refused.
 */

const TABLE = "Bookings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Thrown when the slot's unique key is already taken. */
export class SlotTakenError extends Error {
  constructor() {
    super("That time was just taken.");
  }
}

function rowToBooking(row: Row): Booking {
  return {
    id: String(row.ROWID),
    requestId: row.request_id ? String(row.request_id) : undefined,
    hostId: String(row.host_id),
    startUtc: parseDataStoreTime(row.start_utc),
    endUtc: parseDataStoreTime(row.end_utc),
    clientName: String(row.client_name),
    clientEmail: String(row.client_email),
    company: row.company ? String(row.company) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    status: row.status as BookingStatus,
    failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
    slotKey: String(row.slot_key),
    providerEventId: row.provider_event_id ? String(row.provider_event_id) : undefined,
    providerEventEtag: row.provider_event_etag ? String(row.provider_event_etag) : undefined,
  };
}

export async function listBookingsFromStore(hostId?: string): Promise<Booking[]> {
  const app = await tryGetCatalystApp();
  if (!app) return getStore().bookings.filter((b) => (hostId ? b.hostId === hostId : true));
  const where = hostId ? ` WHERE host_id = ${zcqlLiteral(hostId)}` : "";
  const rows = await app.zcql().executeZCQLQuery(`SELECT * FROM ${TABLE}${where}`);
  return rows.map((r) => rowToBooking(r[TABLE]));
}

export async function getBookingFromStore(id: string): Promise<Booking | undefined> {
  const app = await tryGetCatalystApp();
  if (!app) return getStore().bookings.find((b) => b.id === id);
  if (!/^\d+$/.test(id)) return undefined;
  try {
    return rowToBooking(await app.datastore().table(TABLE).getRow(id));
  } catch {
    return undefined;
  }
}

/** Saves a new booking. Throws SlotTakenError if another live booking already holds `slotKey`. */
export async function insertBookingInStore(booking: Omit<Booking, "id">): Promise<Booking> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const store = getStore();
    if (store.bookings.some((b) => b.slotKey === booking.slotKey)) throw new SlotTakenError();
    const created: Booking = { ...booking, id: newId("bkg") };
    store.bookings.push(created);
    return created;
  }
  try {
    const row = await app
      .datastore()
      .table(TABLE)
      .insertRow({
        host_id: booking.hostId,
        start_utc: formatDataStoreTime(new Date(booking.startUtc)),
        end_utc: formatDataStoreTime(new Date(booking.endUtc)),
        client_name: booking.clientName,
        client_email: booking.clientEmail,
        status: booking.status,
        slot_key: booking.slotKey,
        ...(booking.requestId ? { request_id: booking.requestId } : {}),
        ...(booking.company ? { company: booking.company } : {}),
        ...(booking.notes ? { notes: booking.notes } : {}),
        ...(booking.failureReason ? { failure_reason: booking.failureReason } : {}),
      });
    return rowToBooking(row);
  } catch (err) {
    if (/duplicate|unique/i.test(`${err instanceof Error ? err.message : ""} ${JSON.stringify(err)}`)) throw new SlotTakenError();
    throw err;
  }
}

/** Permanently removes every booking record of a host (failed and pending ones too); returns how many there were. The calendar events themselves are not touched. */
export async function deleteBookingsForHostFromStore(hostId: string): Promise<number> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const store = getStore();
    const before = store.bookings.length;
    store.bookings = store.bookings.filter((b) => b.hostId !== hostId);
    return before - store.bookings.length;
  }
  let removed = 0;
  for (let round = 0; round < 50; round++) {
    const rows = await app.zcql().executeZCQLQuery(`SELECT ROWID FROM ${TABLE} WHERE host_id = ${zcqlLiteral(hostId)}`);
    if (rows.length === 0) break;
    await deleteRowsInBatches(app, TABLE, rows.map((r) => String(r[TABLE].ROWID)));
    removed += rows.length;
  }
  return removed;
}

export async function updateBookingInStore(
  id: string,
  patch: Partial<Pick<Booking, "status" | "failureReason" | "slotKey" | "providerEventId" | "providerEventEtag">>,
): Promise<Booking> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const booking = getStore().bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking not found: ${id}`);
    Object.assign(booking, patch);
    return booking;
  }
  const row = await app
    .datastore()
    .table(TABLE)
    .updateRow({
      ROWID: id,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.failureReason ? { failure_reason: patch.failureReason } : {}),
      ...(patch.slotKey ? { slot_key: patch.slotKey } : {}),
      ...(patch.providerEventId ? { provider_event_id: patch.providerEventId } : {}),
      ...(patch.providerEventEtag ? { provider_event_etag: patch.providerEventEtag } : {}),
    });
  return rowToBooking(row);
}
