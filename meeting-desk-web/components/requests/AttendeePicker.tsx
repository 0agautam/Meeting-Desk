"use client";

import { useState } from "react";
import type { CrmIssue, CrmUser } from "@/lib/crm/users";
import { CHIP, FIELD_INPUT, FIELD_LABEL, META } from "@/lib/ui/classes";
import { NEW_REQUEST_FORM } from "./requestsContent";

type Picked = CrmUser & { required: boolean };

const SEGMENT = "inline-flex h-11 items-center px-3 text-[13px] font-semibold";

/**
 * "Who from ABR is joining?": search the CRM's users and add them; each person is Required or Optional.
 * Everyone listed is invited and gets a tentative hold; only the host and the Required people are checked
 * for free time when times are offered. The host is always in the meeting, so they are shown first and
 * never offered again. Submits one `attendee` field (JSON, with `required`) per person.
 */
export default function AttendeePicker({
  crmUsers,
  issue,
  detail,
  hostName,
  hostEmail,
  initial = [],
}: {
  crmUsers: CrmUser[];
  /** Why the CRM user list couldn't be loaded (null when it was). */
  issue: CrmIssue | null;
  /** Zoho's own error code behind that issue, when it gave one. */
  detail?: string;
  hostName?: string;
  hostEmail?: string;
  /** People already on the request (when editing). */
  initial?: (CrmUser & { required?: boolean })[];
}) {
  const [picked, setPicked] = useState<Picked[]>(initial.map((p) => ({ ...p, required: p.required !== false })));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const hostLower = hostEmail?.toLowerCase();
  const attendees = picked.filter((a) => a.email.toLowerCase() !== hostLower);
  const candidates = crmUsers.filter((u) => u.email.toLowerCase() !== hostLower && !attendees.some((a) => a.id === u.id || a.email.toLowerCase() === u.email.toLowerCase()));
  const needle = query.trim().toLowerCase();
  const matches = needle ? candidates.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)) : candidates;

  function add(user: CrmUser) {
    setPicked((prev) => [...prev, { ...user, required: true }]);
    setQuery("");
    setOpen(false);
  }
  const setRequired = (id: string, required: boolean) => setPicked((prev) => prev.map((a) => (a.id === id ? { ...a, required } : a)));

  return (
    <div>
      <label className={FIELD_LABEL} htmlFor="attendeePick">
        {NEW_REQUEST_FORM.attendeesLabel}
      </label>

      {hostName ? (
        <div className="mb-2 flex items-center gap-2">
          <span className={CHIP}>{hostName}</span>
          <span className={META}>{NEW_REQUEST_FORM.host}</span>
        </div>
      ) : null}

      {attendees.length > 0 ? (
        <ul className="m-0 mb-2 flex list-none flex-col gap-2 p-0">
          {attendees.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-card px-3 py-1.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{a.name}</div>
                <div className={`${META} truncate`}>{a.required ? NEW_REQUEST_FORM.requiredHelp : NEW_REQUEST_FORM.optionalHelp}</div>
              </div>
              <div className="flex items-center gap-2">
                <div role="group" aria-label={NEW_REQUEST_FORM.roleLabel(a.name)} className="inline-flex overflow-hidden rounded-field border border-field-line">
                  <button
                    type="button"
                    aria-pressed={a.required}
                    onClick={() => setRequired(a.id, true)}
                    className={`${SEGMENT} ${a.required ? "bg-ink text-white" : "bg-card text-ink hover:bg-ground"}`}
                  >
                    {NEW_REQUEST_FORM.required}
                  </button>
                  <button
                    type="button"
                    aria-pressed={!a.required}
                    onClick={() => setRequired(a.id, false)}
                    className={`${SEGMENT} border-l border-field-line ${!a.required ? "bg-ink text-white" : "bg-card text-ink hover:bg-ground"}`}
                  >
                    {NEW_REQUEST_FORM.optional}
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-field text-lg text-muted hover:bg-ground hover:text-ink"
                  aria-label={NEW_REQUEST_FORM.removeLabel(a.name)}
                  onClick={() => setPicked((prev) => prev.filter((x) => x.id !== a.id))}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {issue ? (
        <p className={`${META} mt-2`}>
          {NEW_REQUEST_FORM.crmIssue[issue]}
          {detail ? ` (Zoho said: ${detail})` : ""}
        </p>
      ) : (
        <div className="relative max-w-sm" onBlur={(e) => (e.currentTarget.contains(e.relatedTarget) ? undefined : setOpen(false))}>
          <input
            id="attendeePick"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="attendeePickList"
            autoComplete="off"
            className={FIELD_INPUT}
            placeholder={NEW_REQUEST_FORM.addPerson}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter") {
                e.preventDefault();
                if (matches[0]) add(matches[0]);
              }
            }}
          />
          {open ? (
            <ul
              id="attendeePickList"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 m-0 mt-1 max-h-64 list-none overflow-y-auto rounded-card border border-line bg-card p-1 shadow-lg"
            >
              {matches.length === 0 ? (
                <li className={`${META} px-3 py-2`}>{candidates.length === 0 ? NEW_REQUEST_FORM.allAdded : NEW_REQUEST_FORM.noMatch}</li>
              ) : (
                matches.map((u) => (
                  <li key={u.id} role="option" aria-selected={false}>
                    <button type="button" className="flex min-h-11 w-full flex-col justify-center rounded-field px-3 py-1 text-left hover:bg-accent-soft" onClick={() => add(u)}>
                      <span className="text-sm font-semibold text-ink">{u.name}</span>
                      <span className="text-xs text-muted">{u.email}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}
      <p className={`${META} mt-1.5`}>{NEW_REQUEST_FORM.attendeesHint}</p>
      {attendees.map((a) => (
        <input key={a.id} type="hidden" name="attendee" value={JSON.stringify({ id: a.id, name: a.name, email: a.email, required: a.required })} />
      ))}
    </div>
  );
}
