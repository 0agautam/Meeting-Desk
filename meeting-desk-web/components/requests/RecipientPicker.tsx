"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { searchCrmContacts } from "@/app/(staff)/requests/actions";
import type { CrmContact } from "@/lib/crm/zoho";
import { CHIP, CHIP_REMOVE, FIELD_INPUT, FIELD_LABEL, META } from "@/lib/ui/classes";
import { NEW_REQUEST_FORM } from "./requestsContent";

/** Someone the host added as a recipient (To) or copy (Cc). Email is guaranteed. */
export type Contact = { name: string; email: string; company: string | null };

type SearchIssue = "not_connected" | "reconnect" | "unavailable";
type SearchState = {
  query: string;
  status: "done" | "error";
  contacts: CrmContact[];
  hasMore: boolean;
  leadsUnavailable?: boolean;
  issue?: SearchIssue;
  detail?: string;
};

const MIN_SEARCH_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 300;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The client picker used when a request is created and when it is edited: search the CRM (contacts
 * and leads) or type any email address, then choose To or Cc for each person; any number of either.
 * Submits its choices as repeated `to` / `cc` fields (plus `crmAccount`, the first recipient's company).
 */
export default function RecipientPicker({ initialTo = [], initialCc = [] }: { initialTo?: Contact[]; initialCc?: Contact[] }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const [to, setTo] = useState<Contact[]>(initialTo);
  const [cc, setCc] = useState<Contact[]>(initialCc);

  const addedEmails = useMemo(() => new Set([...to, ...cc].map((c) => c.email.toLowerCase())), [to, cc]);
  const trimmedQuery = query.trim();
  const currentSearch = search?.query === trimmedQuery ? search : null;
  const searching = trimmedQuery.length >= MIN_SEARCH_CHARS && !currentSearch;

  // An address typed in full can be used even if the CRM has never heard of it (a new lead, an outside colleague…).
  const typedEmail = EMAIL.test(trimmedQuery) ? trimmedQuery : null;
  const typedIsKnown = typedEmail
    ? addedEmails.has(typedEmail.toLowerCase()) || !!currentSearch?.contacts.some((c) => c.email?.toLowerCase() === typedEmail.toLowerCase())
    : true;
  const showTypedEmail = typedEmail !== null && !typedIsKnown && !searching;

  // Debounced live lookup; `cancelled` drops answers for a query the host has already typed past.
  useEffect(() => {
    if (trimmedQuery.length < MIN_SEARCH_CHARS) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await searchCrmContacts(trimmedQuery);
      if (cancelled) return;
      if (res.ok) setSearch({ query: trimmedQuery, status: "done", contacts: res.contacts, hasMore: res.hasMore, leadsUnavailable: res.leadsUnavailable });
      else if (res.error === "too_short") setSearch({ query: trimmedQuery, status: "done", contacts: [], hasMore: false });
      else setSearch({ query: trimmedQuery, status: "error", contacts: [], hasMore: false, issue: res.error, detail: res.detail });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  /** Adds the person as To or Cc, then clears the search box ready for the next one. */
  function add(contact: Contact, as: "to" | "cc") {
    if (addedEmails.has(contact.email.toLowerCase())) return;
    if (as === "to") setTo((prev) => [...prev, contact]);
    else setCc((prev) => [...prev, contact]);
    setQuery("");
    setSearch(null);
  }

  const rowActions = (contact: Contact) => (
    <div className="flex gap-1.5">
      <button type="button" className={CHIP} onClick={() => add(contact, "to")} aria-label={`Add ${contact.name} to To`}>
        {NEW_REQUEST_FORM.addTo}
      </button>
      <button type="button" className={CHIP} onClick={() => add(contact, "cc")} aria-label={`Add ${contact.name} to Cc`}>
        {NEW_REQUEST_FORM.addCc}
      </button>
    </div>
  );

  const hasResults = !!currentSearch && currentSearch.contacts.length > 0;
  const toLink = (text: string) => (
    <Link href="/account" className="font-semibold underline">
      {text}
    </Link>
  );

  return (
    <div>
      <label className={FIELD_LABEL} htmlFor="clientQuery">
        {NEW_REQUEST_FORM.clientLabel}
      </label>
      <input
        id="clientQuery"
        className={FIELD_INPUT}
        placeholder={NEW_REQUEST_FORM.clientPlaceholder}
        value={query}
        autoComplete="off"
        aria-describedby="clientSearchStatus"
        onChange={(e) => setQuery(e.target.value)}
      />
      <p id="clientSearchStatus" role="status" aria-live="polite" className={`${META} mt-2 empty:hidden`}>
        {trimmedQuery.length === 0
          ? null
          : trimmedQuery.length < MIN_SEARCH_CHARS
            ? NEW_REQUEST_FORM.minChars
            : searching
              ? NEW_REQUEST_FORM.searching
              : currentSearch?.status === "error"
                ? (
                    <>
                      {NEW_REQUEST_FORM.crmIssue[currentSearch.issue ?? "unavailable"]}
                      {currentSearch.detail ? ` (Zoho said: ${currentSearch.detail})` : ""}{" "}
                      {currentSearch.issue === "not_connected" || currentSearch.issue === "reconnect" ? toLink(NEW_REQUEST_FORM.openSettings) : null}
                    </>
                  )
                : currentSearch && currentSearch.contacts.length === 0 && !showTypedEmail
                  ? NEW_REQUEST_FORM.noResults
                  : null}
      </p>

      {hasResults || showTypedEmail ? (
        <ul aria-label={NEW_REQUEST_FORM.resultsLabel} className="mt-2 max-h-72 overflow-y-auto rounded-field border border-line bg-card">
          {currentSearch?.contacts.map((c) => {
            const added = c.email ? addedEmails.has(c.email.toLowerCase()) : false;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 last:border-b-0">
                <div className="flex min-w-0 flex-col">
                  <span className="font-semibold text-ink">
                    {c.name} <span className="ml-1 rounded-full bg-ground px-2 py-0.5 text-[11px] font-medium text-muted">{c.kind}</span>
                    {added ? <span className="ml-2 text-xs font-medium text-accent">Added</span> : null}
                  </span>
                  <span className={META}>
                    {c.email ?? NEW_REQUEST_FORM.noEmail}
                    {c.company ? ` · ${c.company}` : ""}
                  </span>
                </div>
                {c.email && !added ? rowActions({ name: c.name, email: c.email, company: c.company }) : null}
              </li>
            );
          })}
          {showTypedEmail && typedEmail ? (
            <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 last:border-b-0">
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">{typedEmail}</span>
                <span className={META}>{NEW_REQUEST_FORM.notInCrm}</span>
              </div>
              {rowActions({ name: typedEmail, email: typedEmail, company: null })}
            </li>
          ) : null}
        </ul>
      ) : null}
      {currentSearch?.hasMore ? <p className={`${META} mt-1.5`}>{NEW_REQUEST_FORM.hasMore}</p> : null}
      {currentSearch?.leadsUnavailable ? (
        <p className={`${META} mt-1.5`}>
          {NEW_REQUEST_FORM.leadsUnavailable} {toLink(NEW_REQUEST_FORM.openSettings)}
        </p>
      ) : null}
      {trimmedQuery.length === 0 ? <p className={`${META} mt-1.5`}>{NEW_REQUEST_FORM.clientHelp}</p> : null}

      {to.length + cc.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {to.map((c) => (
            <span key={c.email} className={CHIP}>
              To: {c.name}
              <button type="button" className={CHIP_REMOVE} aria-label={`Remove ${c.name} from To`} onClick={() => setTo((p) => p.filter((x) => x.email !== c.email))}>
                ×
              </button>
            </span>
          ))}
          {cc.map((c) => (
            <span key={c.email} className={CHIP}>
              Cc: {c.name}
              <button type="button" className={CHIP_REMOVE} aria-label={`Remove ${c.name} from Cc`} onClick={() => setCc((p) => p.filter((x) => x.email !== c.email))}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {to.find((c) => c.company)?.company ? <input type="hidden" name="crmAccount" value={to.find((c) => c.company)?.company ?? ""} /> : null}
      {to.map((c) => (
        <input key={c.email} type="hidden" name="to" value={c.email} />
      ))}
      {cc.map((c) => (
        <input key={c.email} type="hidden" name="cc" value={c.email} />
      ))}
    </div>
  );
}
