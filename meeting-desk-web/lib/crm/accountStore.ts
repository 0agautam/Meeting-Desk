import "server-only";
import { tryGetCatalystApp } from "@/lib/data/catalystApp";
import { zcqlLiteral } from "@/lib/data/dsHelpers";

/**
 * A person's own Zoho CRM approval, in the Data Store table "CrmAccounts" (staff_id [unique],
 * refresh_token [encrypted text], account_email, status). It exists for people whose calendar is NOT
 * Zoho (their calendar approval can't double as CRM access); Zoho-calendar users' calendar approval
 * already covers the CRM. Falls back to memory when not running on Catalyst.
 */

const TABLE = "CrmAccounts";

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

export async function getCrmAccount(staffId: string): Promise<CrmAccount | null> {
  if (!(await tryGetCatalystApp())) return memory().get(staffId) ?? null;
  const row = await findRow(staffId);
  return row ? rowToAccount(row) : null;
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
