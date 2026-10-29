"use client";

import { useState } from "react";
import { resubmitRequest } from "@/app/(staff)/requests/[id]/actions";
import type { CrmIssue, CrmUser } from "@/lib/crm/users";
import type { MeetingRequest } from "@/lib/types";
import {
  BTN_PRIMARY,
  CARD_TITLE,
  CHIP,
  CHIP_ACTIVE,
  CHIP_ACTIVE_ACCENT,
  FIELD_INPUT,
  FIELD_INPUT_CHANGED,
  FIELD_LABEL,
  FIELD_TEXTAREA,
  META,
} from "@/lib/ui/classes";
import AttendeePicker from "./AttendeePicker";
import RecipientPicker, { type Contact } from "./RecipientPicker";
import { DURATION_OPTIONS, REQUEST_DETAIL } from "./requestsContent";

/**
 * Wireframe 2's reply box, also used to edit a request before the email is sent: optional note
 * (required when the coordinator asked a question) plus editable subject, client (same picker as
 * when the request was created), ABR attendees, notes and duration.
 */
export default function ReplyForm({
  request,
  hostName,
  hostEmail,
  crmUsers,
  crmUsersIssue,
  crmUsersDetail,
}: {
  request: MeetingRequest;
  hostName?: string;
  hostEmail?: string;
  crmUsers: CrmUser[];
  crmUsersIssue: CrmIssue | null;
  crmUsersDetail?: string;
}) {
  const answering = request.status === "needs_info";
  const [subject, setSubject] = useState(request.subject);
  const [notes, setNotes] = useState(request.notes);
  const [durationMin, setDurationMin] = useState(request.durationMin);

  const subjectChanged = subject.trim() !== request.subject;
  const notesChanged = notes.trim() !== request.notes;
  const durationChanged = durationMin !== request.durationMin;

  // The request only stores addresses; the CRM account label belongs to the first recipient.
  const asContact = (email: string, index: number): Contact => ({ name: email, email, company: index === 0 ? (request.crmAccount ?? null) : null });
  const initialAttendees = request.attendees.map((a) => ({ id: a.crmUserId ?? a.email, name: a.name, email: a.email, required: a.required !== false }));

  return (
    <form action={resubmitRequest} className="flex flex-col gap-3 rounded-card border border-line p-4">
      <input type="hidden" name="requestId" value={request.id} />
      <div className={CARD_TITLE}>{answering ? REQUEST_DETAIL.replyTitle : REQUEST_DETAIL.editTitle}</div>
      {answering ? null : <p className={`${META} m-0`}>{REQUEST_DETAIL.editHelp}</p>}
      <textarea
        name="message"
        required={answering}
        aria-label={answering ? REQUEST_DETAIL.replyLabel : REQUEST_DETAIL.noteLabel}
        rows={3}
        className={FIELD_TEXTAREA}
        style={{ minHeight: "72px" }}
        placeholder={answering ? REQUEST_DETAIL.replyRequired : REQUEST_DETAIL.noteLabel}
      />
      <div className="text-xs font-semibold text-ink">{REQUEST_DETAIL.updateLabel}</div>
      <div>
        <label className={FIELD_LABEL} htmlFor="subject">
          {REQUEST_DETAIL.subjectLabel}
        </label>
        <input
          id="subject"
          name="subject"
          required
          className={subjectChanged ? FIELD_INPUT_CHANGED : FIELD_INPUT}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <RecipientPicker initialTo={request.to.map(asContact)} initialCc={request.cc.map((email) => asContact(email, 1))} />

      <AttendeePicker
        crmUsers={crmUsers}
        issue={crmUsersIssue}
        detail={crmUsersDetail}
        hostName={hostName}
        hostEmail={hostEmail}
        initial={initialAttendees}
      />

      <div>
        <label className={FIELD_LABEL} htmlFor="notes">
          {REQUEST_DETAIL.notesLabel}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={`${FIELD_TEXTAREA}${notesChanged ? " border-accent bg-accent-soft" : ""}`}
          style={{ minHeight: "72px" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div>
        <span className={FIELD_LABEL}>{REQUEST_DETAIL.durationLabel}</span>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((d) => {
            const active = d.minutes === durationMin;
            const className = active ? (durationChanged ? CHIP_ACTIVE_ACCENT : CHIP_ACTIVE) : CHIP;
            return (
              <button key={d.minutes} type="button" className={className} onClick={() => setDurationMin(d.minutes)} aria-pressed={active}>
                {d.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="durationMin" value={durationMin} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className={BTN_PRIMARY}>
          {answering ? REQUEST_DETAIL.resubmit : REQUEST_DETAIL.resubmitEdit}
        </button>
        <span className={META}>{REQUEST_DETAIL.resubmitHelp(request.version + 1)}</span>
      </div>
    </form>
  );
}
