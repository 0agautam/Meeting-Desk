"use client";

import Link from "next/link";
import { useState } from "react";
import type { CrmIssue, CrmUser } from "@/lib/crm/users";
import { CHIP, CHIP_REMOVE, FIELD_LABEL, FIELD_SELECT, META } from "@/lib/ui/classes";
import { NEW_REQUEST_FORM } from "./requestsContent";

/**
 * "Who from ABR is joining?": a picklist of the CRM's users, shown as chips. Everyone listed is just
 * invited (no required/optional, calendars not checked). The host is always in the meeting, so they
 * are shown first and never offered again. Submits one `attendee` field (JSON) per person.
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
  initial?: CrmUser[];
}) {
  const [picked, setPicked] = useState<CrmUser[]>(initial);
  const hostLower = hostEmail?.toLowerCase();
  const attendees = picked.filter((a) => a.email.toLowerCase() !== hostLower);
  const candidates = crmUsers.filter((u) => u.email.toLowerCase() !== hostLower && !attendees.some((a) => a.id === u.id || a.email.toLowerCase() === u.email.toLowerCase()));

  function add(userId: string) {
    const user = candidates.find((u) => u.id === userId);
    if (user) setPicked((prev) => [...prev, user]);
  }

  return (
    <div>
      <label className={FIELD_LABEL} htmlFor="attendeePick">
        {NEW_REQUEST_FORM.attendeesLabel}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {hostName ? <span className={CHIP}>{hostName} · host</span> : null}
        {attendees.map((a) => (
          <span key={a.id} className={CHIP}>
            {a.name}
            <button type="button" className={CHIP_REMOVE} aria-label={`Remove ${a.name}`} onClick={() => setPicked((prev) => prev.filter((x) => x.id !== a.id))}>
              ×
            </button>
          </span>
        ))}
      </div>
      {issue ? (
        <p className={`${META} mt-2`}>
          {NEW_REQUEST_FORM.crmIssue[issue]}
          {detail ? ` (Zoho said: ${detail})` : ""}{" "}
          {issue !== "unavailable" ? (
            <Link href="/account" className="font-semibold underline">
              {NEW_REQUEST_FORM.openSettings}
            </Link>
          ) : null}
        </p>
      ) : (
        <select id="attendeePick" className={`${FIELD_SELECT} mt-2 max-w-sm`} value="" onChange={(e) => add(e.target.value)} disabled={candidates.length === 0}>
          <option value="">{NEW_REQUEST_FORM.addPerson}</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )}
      <p className={`${META} mt-1.5`}>{NEW_REQUEST_FORM.attendeesHint}</p>
      {attendees.map((a) => (
        <input key={a.id} type="hidden" name="attendee" value={JSON.stringify({ id: a.id, name: a.name, email: a.email })} />
      ))}
    </div>
  );
}
