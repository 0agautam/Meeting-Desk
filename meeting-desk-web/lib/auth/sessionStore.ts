import "server-only";
import { tryGetCatalystApp } from "@/lib/data/catalystApp";
import { formatDataStoreTime, parseDataStoreTime, zcqlLiteral } from "@/lib/data/dsHelpers";

/**
 * Server-side sessions, stored in the Data Store table "Sessions" (columns token_hash
 * [unique], staff_id, staff_email, expires_at [DateTime]). Only a SHA-256 hash of the cookie's
 * token is stored, so reading the table can't sign anyone in. Falls back to an in-memory
 * map when not running on Catalyst (local `next dev`).
 */

const TABLE = "Sessions";

/** expiresAt is epoch seconds in code; the DateTime column holds it as a project-clock timestamp. */
type StoredSession = { staffId: string; expiresAt: number };
type NewSession = StoredSession & { staffEmail: string };

const toEpochSeconds = (dataStoreTime: unknown) => Math.floor(new Date(parseDataStoreTime(dataStoreTime)).getTime() / 1000);

const globalForSessions = globalThis as typeof globalThis & { __meetingDeskSessions?: Map<string, StoredSession> };
function memory(): Map<string, StoredSession> {
  return (globalForSessions.__meetingDeskSessions ??= new Map());
}

export async function saveSession(tokenHash: string, session: NewSession): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().set(tokenHash, session);
    return;
  }
  await app.datastore().table(TABLE).insertRow({
    token_hash: tokenHash,
    staff_id: session.staffId,
    staff_email: session.staffEmail,
    expires_at: formatDataStoreTime(new Date(session.expiresAt * 1000)),
  });
}

export async function findSession(tokenHash: string): Promise<StoredSession | null> {
  const app = await tryGetCatalystApp();
  if (!app) return memory().get(tokenHash) ?? null;
  const rows = await app.zcql().executeZCQLQuery(`SELECT staff_id, expires_at FROM ${TABLE} WHERE token_hash = ${zcqlLiteral(tokenHash)}`);
  const row = rows[0]?.[TABLE];
  return row ? { staffId: String(row.staff_id), expiresAt: toEpochSeconds(row.expires_at) } : null;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().delete(tokenHash);
    return;
  }
  const rows = await app.zcql().executeZCQLQuery(`SELECT ROWID FROM ${TABLE} WHERE token_hash = ${zcqlLiteral(tokenHash)}`);
  const rowId = rows[0]?.[TABLE]?.ROWID;
  if (rowId) await app.datastore().table(TABLE).deleteRow(rowId);
}

/** Housekeeping at sign-in: drops this person's sessions that have already expired, so the table stays small. */
export async function pruneExpiredSessions(staffId: string): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const app = await tryGetCatalystApp();
  if (!app) {
    for (const [hash, s] of memory()) if (s.staffId === staffId && s.expiresAt < nowSeconds) memory().delete(hash);
    return;
  }
  const rows = await app.zcql().executeZCQLQuery(`SELECT ROWID, expires_at FROM ${TABLE} WHERE staff_id = ${zcqlLiteral(staffId)}`);
  const expired = rows.map((r) => r[TABLE]).filter((r) => toEpochSeconds(r.expires_at) < nowSeconds).map((r) => String(r.ROWID));
  if (expired.length > 0) await app.datastore().table(TABLE).deleteRows(expired);
}

/** Signs a person out everywhere (used when they are removed from the team). */
export async function deleteSessionsForStaff(staffId: string): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    for (const [hash, s] of memory()) if (s.staffId === staffId) memory().delete(hash);
    return;
  }
  const rows = await app.zcql().executeZCQLQuery(`SELECT ROWID FROM ${TABLE} WHERE staff_id = ${zcqlLiteral(staffId)}`);
  const ids = rows.map((r) => String(r[TABLE].ROWID));
  if (ids.length > 0) await app.datastore().table(TABLE).deleteRows(ids);
}
