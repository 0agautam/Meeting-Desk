import "server-only";
import { tryGetCatalystApp } from "@/lib/data/catalystApp";
import { zcqlLiteral } from "@/lib/data/dsHelpers";
import type { CalendarProvider } from "@/lib/types";

/**
 * Each person's saved calendar permission, in the Data Store table "CalendarAccounts"
 * (staff_id [unique], provider, refresh_token, account_email, calendar_uid, status).
 * One row per person, so a person has one active provider at a time. Falls back to
 * memory when not running on Catalyst (local `next dev`).
 */

const TABLE = "CalendarAccounts";

export type CalendarAccount = {
  staffId: string;
  provider: CalendarProvider;
  refreshToken: string;
  accountEmail: string;
  calendarUid: string;
  status: "connected" | "error";
};

const globalForAccounts = globalThis as typeof globalThis & { __meetingDeskCalendarAccounts?: Map<string, CalendarAccount> };
const memory = () => (globalForAccounts.__meetingDeskCalendarAccounts ??= new Map());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToAccount = (row: Record<string, any>): CalendarAccount => ({
  staffId: String(row.staff_id),
  provider: row.provider as CalendarProvider,
  refreshToken: String(row.refresh_token ?? ""),
  accountEmail: String(row.account_email ?? ""),
  calendarUid: String(row.calendar_uid ?? ""),
  status: row.status === "error" ? "error" : "connected",
});

async function findRow(staffId: string) {
  const app = await tryGetCatalystApp();
  if (!app) return null;
  const rows = await app.zcql().executeZCQLQuery(`SELECT * FROM ${TABLE} WHERE staff_id = ${zcqlLiteral(staffId)}`);
  return rows[0]?.[TABLE] ?? null;
}

export async function getCalendarAccount(staffId: string): Promise<CalendarAccount | null> {
  if (!(await tryGetCatalystApp())) return memory().get(staffId) ?? null;
  const row = await findRow(staffId);
  return row ? rowToAccount(row) : null;
}

/** Who has approved which calendar, for the admin's team table: staff id -> provider and status. Never includes the tokens. */
export async function listCalendarStatuses(): Promise<Map<string, Pick<CalendarAccount, "provider" | "status" | "accountEmail">>> {
  const rows: CalendarAccount[] = [];
  const app = await tryGetCatalystApp();
  if (!app) rows.push(...memory().values());
  else {
    const res = await app.datastore().table(TABLE).getPagedRows({ maxRows: 200 });
    rows.push(...res.data.map(rowToAccount));
  }
  return new Map(rows.map((a) => [a.staffId, { provider: a.provider, status: a.status, accountEmail: a.accountEmail }]));
}

/** Saves (or replaces) the person's connection. */
export async function saveCalendarAccount(account: CalendarAccount): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().set(account.staffId, account);
    return;
  }
  const values = {
    provider: account.provider,
    refresh_token: account.refreshToken,
    account_email: account.accountEmail,
    calendar_uid: account.calendarUid,
    status: account.status,
  };
  const existing = await findRow(account.staffId);
  const table = app.datastore().table(TABLE);
  if (existing) await table.updateRow({ ROWID: existing.ROWID, ...values });
  else await table.insertRow({ staff_id: account.staffId, ...values });
}

export async function deleteCalendarAccount(staffId: string): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().delete(staffId);
    return;
  }
  const existing = await findRow(staffId);
  if (existing) await app.datastore().table(TABLE).deleteRow(existing.ROWID);
}
