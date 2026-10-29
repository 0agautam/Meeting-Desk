import "server-only";
import { CrmAccessError, assertCrmAuthorized, crmHeaders } from "./auth";

/**
 * Zoho CRM client lookup using the signed-in person's own Zoho approval (lib/crm/auth.ts),
 * so the people they can find are the ones their own CRM permissions allow. Searches Contacts
 * and Leads (a meeting can be for either).
 */

const COQL_URL = "https://www.zohoapis.com/crm/v8/coql";
const RESULT_LIMIT = 15;

export type CrmContact = {
  id: string;
  name: string;
  /** null when the CRM record has no email — such people can't receive the request. */
  email: string | null;
  company: string | null;
  /** Which CRM module the record came from. */
  kind: "Contact" | "Lead";
};

export type CrmSearchResult = {
  contacts: CrmContact[];
  hasMore: boolean;
  /** Leads couldn't be searched (the approval predates the all-modules permission, or the person can't see Leads); Contacts still were. */
  leadsUnavailable?: boolean;
};

/**
 * COQL has no documented quote escaping, so the term is reduced to a conservative
 * character set (letters, digits, spaces and . @ - + & ,) — that also strips the
 * `%` and `_` LIKE wildcards. Returns null if too short to search.
 */
export function sanitizeSearchTerm(raw: string): string | null {
  const term = raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} .@\-+&,]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return term.length >= 2 ? term : null;
}

type CoqlRow = {
  id: string;
  Full_Name?: string | null;
  Email?: string | null;
  Company?: string | null;
  "Account_Name.Account_Name"?: string | null;
};

async function runCoql(headers: Record<string, string>, staffId: string, selectQuery: string): Promise<CoqlRow[]> {
  const res = await fetch(COQL_URL, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ select_query: selectQuery }),
  });
  await assertCrmAuthorized(res, staffId);
  // COQL answers 204 (no body) when nothing matches.
  if (res.status === 204) return [];
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`CRM search failed: ${res.status} ${bodyText.slice(0, 300)}`);
  return (JSON.parse(bodyText) as { data?: CoqlRow[] }).data ?? [];
}

export async function searchContacts(staffId: string, rawTerm: string): Promise<CrmSearchResult> {
  const term = sanitizeSearchTerm(rawTerm);
  if (!term) return { contacts: [], hasMore: false };

  const headers = await crmHeaders(staffId);

  // COQL only combines conditions two at a time: three `or`s in one flat group is a
  // SYNTAX_ERROR (found live, Oct 2, 2026), so the third is nested around the first pair.
  const like = `'%${term}%'`;
  const contactsQuery =
    "select id, Full_Name, Email, Account_Name.Account_Name from Contacts " +
    `where (((Email like ${like}) or (Full_Name like ${like})) or (Account_Name.Account_Name like ${like})) ` +
    `limit ${RESULT_LIMIT + 1}`;
  const leadsQuery =
    "select id, Full_Name, Email, Company from Leads " +
    `where (((Email like ${like}) or (Full_Name like ${like})) or (Company like ${like})) ` +
    `limit ${RESULT_LIMIT + 1}`;

  const [contactsRes, leadsRes] = await Promise.allSettled([runCoql(headers, staffId, contactsQuery), runCoql(headers, staffId, leadsQuery)]);

  // If Contacts failed, the whole search failed (an access problem is reported as such).
  if (contactsRes.status === "rejected") throw contactsRes.reason;
  if (leadsRes.status === "rejected") {
    const reason = leadsRes.reason;
    if (!(reason instanceof CrmAccessError)) console.warn("searchContacts: Leads search failed:", reason);
  }

  const toContact = (kind: CrmContact["kind"]) => (r: CoqlRow): CrmContact => ({
    id: `${kind}-${r.id}`,
    name: r.Full_Name?.trim() || r.Email?.trim() || "Unnamed",
    email: r.Email?.trim() || null,
    company: (kind === "Contact" ? r["Account_Name.Account_Name"] : r.Company)?.trim() || null,
    kind,
  });
  const contactRows = contactsRes.value;
  const leadRows = leadsRes.status === "fulfilled" ? leadsRes.value : [];

  return {
    contacts: [...contactRows.slice(0, RESULT_LIMIT).map(toContact("Contact")), ...leadRows.slice(0, RESULT_LIMIT).map(toContact("Lead"))],
    hasMore: contactRows.length > RESULT_LIMIT || leadRows.length > RESULT_LIMIT,
    ...(leadsRes.status === "rejected" ? { leadsUnavailable: true } : {}),
  };
}
