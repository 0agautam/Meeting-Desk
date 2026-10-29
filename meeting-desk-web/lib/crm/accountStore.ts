import "server-only";
import { tryGetCatalystApp } from "@/lib/data/catalystApp";
import { zcqlLiteral } from "@/lib/data/dsHelpers";

/**
 * Zoho CRM approvals, in the Data Store table "CrmAccounts" (staff_id [unique], refresh_token [encrypted text],
 * account_email, status). The organisation's one shared connection, made by an admin in Settings, is the row whose
 * staff_id is ORGANISATION_CRM_ID; everyone's CRM searches use it. Older per-person rows (people whose calendar is
 * not Zoho) are only a fallback. Falls back to memory when not running on Catalyst.
 */

const TABLE = "CrmAccounts";

/** The staff_id of the organisation's shared CRM connection. Real staff ids are numeric row ids, so it can't clash. */
export const ORGANISATION_CRM_ID = "organisation";

export type CrmAccount = { staffId: string; refreshToken: string; accountEmail: string; status: "connected" | "error" };

const globalForAccounts = globalThis as typeof globalThis & { __meetingDeskCrmAccounts?: Map<string, CrmAccount> };
const memory = () => (globalForAccounts.__meetingDeskCrmAccounts ??= new Map());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToAccount = (row: Record<string, any>): CrmAccount => ({
  staffId: String(row.staff_id),
  refreshToken: String(row.refresh_token ?? ""),
  accountEmail: String(row.account_email ?? ""),
  status: row.status === "error" ? "error" : "connected",
});

async function findRow(staffId: string) {
  const app = await tryGetCatalystApp();
  if (!app) return null;
  const rows = await app.zcql().executeZCQLQuery(`SELECT * FROM ${TABLE} WHERE staff_id = ${zcqlLiteral(staffId)}`);
  return rows[0]?.[TABLE] ?? null;
}

/** The saved approval, or null if there is none. The organisation's row can exist without one (it also holds the hours and time zone). */
export async function getCrmAccount(staffId: string): Promise<CrmAccount | null> {
  if (!(await tryGetCatalystApp())) return memory().get(staffId) ?? null;
  const row = await findRow(staffId);
  return row && row.refresh_token ? rowToAccount(row) : null;
}

/** Saves (or replaces) the person's CRM approval. */
export async function saveCrmAccount(account: CrmAccount): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().set(account.staffId, account);
    return;
  }
  const values = { refresh_token: account.refreshToken, account_email: account.accountEmail, status: account.status };
  const existing = await findRow(account.staffId);
  const table = app.datastore().table(TABLE);
  if (existing) await table.updateRow({ ROWID: existing.ROWID, ...values });
  else await table.insertRow({ staff_id: account.staffId, ...values });
}

export async function deleteCrmAccount(staffId: string): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().delete(staffId);
    return;
  }
  const existing = await findRow(staffId);
  if (existing) await app.datastore().table(TABLE).deleteRow(existing.ROWID);
}

/**
 * Forgets the organisation's approval but keeps its row, which also holds the saved time zone and hours. Falls back to deleting the
 * row when there is nothing else on it.
 */
export async function clearOrganisationApproval(): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    memory().delete(ORGANISATION_CRM_ID);
    return;
  }
  const existing = await findRow(ORGANISATION_CRM_ID);
  if (!existing) return;
  if (existing.org_timezone || existing.business_hours) {
    await app.datastore().table(TABLE).updateRow({ ROWID: existing.ROWID, refresh_token: "", account_email: "", status: "error" });
  } else {
    await app.datastore().table(TABLE).deleteRow(existing.ROWID);
  }
}
