import "server-only";
import { CrmAccessError, assertCrmAuthorized, crmHeaders } from "./auth";

/**
 * The CRM's active users: the "Who from ABR is joining?" picklist. Read with the signed-in person's
 * own Zoho approval. Cached in memory per person for a few minutes since the list rarely changes.
 */

const USERS_URL = "https://www.zohoapis.com/crm/v8/users";
const PER_PAGE = 200;
const MAX_PAGES = 5;
const CACHE_MS = 10 * 60_000;

export type CrmUser = { id: string; name: string; email: string };

type CrmUserRow = { id: string; full_name?: string | null; email?: string | null; status?: string | null };

const globalForUsers = globalThis as typeof globalThis & { __meetingDeskCrmUsers?: Map<string, { users: CrmUser[]; at: number }> };
const cache = () => (globalForUsers.__meetingDeskCrmUsers ??= new Map());

/** Throws CrmAccessError if the person hasn't connected Zoho or must reconnect; any other error means the CRM couldn't be reached. */
export async function listCrmUsers(staffId: string): Promise<CrmUser[]> {
  const cached = cache().get(staffId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.users;

  const headers = await crmHeaders();
  const users: CrmUser[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${USERS_URL}?${new URLSearchParams({ type: "ActiveUsers", page: String(page), per_page: String(PER_PAGE) })}`, { headers });
    await assertCrmAuthorized(res);
    if (res.status === 204) break;
    const text = await res.text();
    if (!res.ok) throw new Error(`CRM users failed: ${res.status} ${text.slice(0, 300)}`);
    const data = JSON.parse(text) as { users?: CrmUserRow[]; info?: { more_records?: boolean } };
    for (const u of data.users ?? []) {
      const email = u.email?.trim();
      if (!email || (u.status && u.status.toLowerCase() !== "active")) continue;
      users.push({ id: u.id, name: u.full_name?.trim() || email, email });
    }
    if (!data.info?.more_records) break;
  }
  users.sort((a, b) => a.name.localeCompare(b.name));
  cache().set(staffId, { users, at: Date.now() });
  return users;
}

export type CrmIssue = "not_connected" | "reconnect" | "unavailable";

/** For the request forms: the CRM user list, or why it couldn't be loaded (never throws). */
export async function loadCrmUsersForForm(staffId: string): Promise<{ users: CrmUser[]; issue: CrmIssue | null; detail?: string }> {
  try {
    return { users: await listCrmUsers(staffId), issue: null };
  } catch (err) {
    if (err instanceof CrmAccessError) return { users: [], issue: err.kind, detail: err.detail };
    console.warn("loadCrmUsersForForm: couldn't load CRM users:", err);
    return { users: [], issue: "unavailable" };
  }
}
