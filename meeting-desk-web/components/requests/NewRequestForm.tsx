"use client";

import { useState } from "react";
import { saveRequestDraft, submitRequest, submitRequestAndStartAnother } from "@/app/(staff)/requests/actions";
import type { CrmIssue, CrmUser } from "@/lib/crm/users";
import type { Staff } from "@/lib/types";
import { BTN, BTN_GHOST, BTN_PRIMARY, CHIP, CHIP_ACTIVE, FIELD_INPUT, FIELD_LABEL, FIELD_SELECT, FIELD_TEXTAREA } from "@/lib/ui/classes";
import AttendeePicker from "./AttendeePicker";
import RecipientPicker from "./RecipientPicker";
import { DEFAULT_DURATION_MIN, DURATION_OPTIONS, NEW_REQUEST_FORM } from "./requestsContent";

/** Wireframe 1's form. Client component: the pickers and the duration chips need local state. */
export default function NewRequestForm({
  staff,
  defaultHostId,
  selectableHostIds,
  crmUsers,
  crmUsersIssue,
  crmUsersDetail,
}: {
  staff: Staff[];
  defaultHostId: string;
  /** Hosts this person may submit for: just themselves for a host, every host for an admin. */
  selectableHostIds: string[];
  /** The CRM's active users: the "Who from ABR is joining?" picklist. */
  crmUsers: CrmUser[];
  /** Why the CRM user list couldn't be loaded (null when it was), so the picklist says so instead of looking empty. */
  crmUsersIssue: CrmIssue | null;
  /** Zoho's own error code behind that issue, when it gave one. */
  crmUsersDetail?: string;
}) {
  const hosts = staff.filter((s) => s.roles.includes("host") && selectableHostIds.includes(s.id));
  const [hostId, setHostId] = useState(defaultHostId);
  const [durationMin, setDurationMin] = useState<number>(DEFAULT_DURATION_MIN);
  const host = staff.find((s) => s.id === hostId);

  return (
    <form action={submitRequest} className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="hostId">
            {NEW_REQUEST_FORM.hostLabel}
          </label>
          <select id="hostId" name="hostId" className={FIELD_SELECT} value={hostId} onChange={(e) => setHostId(e.target.value)}>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="subject">
            {NEW_REQUEST_FORM.subjectLabel}
          </label>
          <input id="subject" name="subject" required className={FIELD_INPUT} placeholder={NEW_REQUEST_FORM.subjectPlaceholder} />
        </div>
      </div>

      <RecipientPicker />

      <AttendeePicker crmUsers={crmUsers} issue={crmUsersIssue} detail={crmUsersDetail} hostName={host?.name} hostEmail={host?.email} />

      <div>
        <span className={FIELD_LABEL}>{NEW_REQUEST_FORM.durationLabel}</span>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.minutes}
              type="button"
              className={d.minutes === durationMin ? CHIP_ACTIVE : CHIP}
              onClick={() => setDurationMin(d.minutes)}
              aria-pressed={d.minutes === durationMin}
            >
              {d.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="durationMin" value={durationMin} />
      </div>

      <div className="flex flex-1 flex-col">
        <label className={FIELD_LABEL} htmlFor="notes">
          {NEW_REQUEST_FORM.notesLabel}
        </label>
        <textarea id="notes" name="notes" className={FIELD_TEXTAREA} placeholder={NEW_REQUEST_FORM.notesPlaceholder} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={BTN_PRIMARY}>
          {NEW_REQUEST_FORM.submit}
        </button>
        <button type="submit" formAction={submitRequestAndStartAnother} className={BTN}>
          {NEW_REQUEST_FORM.submitAndAnother}
        </button>
        <button type="submit" formAction={saveRequestDraft} className={BTN_GHOST}>
          {NEW_REQUEST_FORM.saveDraft}
        </button>
      </div>
    </form>
  );
}
