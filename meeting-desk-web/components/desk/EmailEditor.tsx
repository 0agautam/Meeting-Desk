"use client";

import { useActionState, useState } from "react";
import { saveEmailDraft, type SaveEmailState } from "@/app/(staff)/desk/[id]/actions";
import CopyEmailButton from "@/components/desk/CopyEmailButton";
import type { EmailDraft } from "@/lib/types";
import { BTN, FIELD_INPUT, FIELD_LABEL, FIELD_TEXTAREA, META } from "@/lib/ui/classes";
import { DESK_DETAIL } from "./deskContent";

/**
 * The client email, always editable (also after it was marked as sent): subject, To, Cc and the
 * text. "Save changes" stores it on the request; "Copy email" copies what's on screen right now.
 */
export default function EmailEditor({ requestId, draft }: { requestId: string; draft: EmailDraft }) {
  const [state, formAction, pending] = useActionState<SaveEmailState, FormData>(saveEmailDraft, null);
  const [subject, setSubject] = useState(draft.subject);
  const [to, setTo] = useState(draft.to.join(", "));
  const [cc, setCc] = useState(draft.cc.join(", "));
  const [body, setBody] = useState(draft.body);

  // A fresh email (Generate email / Regenerate) replaces what's on screen.
  const savedKey = JSON.stringify(draft);
  const [seenKey, setSeenKey] = useState(savedKey);
  if (seenKey !== savedKey) {
    setSeenKey(savedKey);
    setSubject(draft.subject);
    setTo(draft.to.join(", "));
    setCc(draft.cc.join(", "));
    setBody(draft.body);
  }

  const dirty = subject !== draft.subject || to !== draft.to.join(", ") || cc !== draft.cc.join(", ") || body !== draft.body;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-line p-3.5">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{DESK_DETAIL.emailHeaderLabel}</div>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="email-to">
            {DESK_DETAIL.toLabel}
          </label>
          <input id="email-to" name="to" className={FIELD_INPUT} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="email-cc">
            {DESK_DETAIL.ccLabel}
          </label>
          <input id="email-cc" name="cc" className={FIELD_INPUT} value={cc} onChange={(e) => setCc(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="email-subject">
          {DESK_DETAIL.subjectLabel}
        </label>
        <input id="email-subject" name="subject" required className={FIELD_INPUT} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="email-body">
          {DESK_DETAIL.emailTextLabel}
        </label>
        <textarea
          id="email-body"
          name="body"
          required
          rows={14}
          className={`${FIELD_TEXTAREA} leading-relaxed`}
          style={{ minHeight: "280px" }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={pending || !dirty} className={`${BTN} disabled:cursor-not-allowed disabled:opacity-60`}>
          {pending ? DESK_DETAIL.saving : DESK_DETAIL.saveEmail}
        </button>
        <CopyEmailButton requestId={requestId} draft={body} />
        {state && "error" in state ? (
          <span role="alert" className="text-xs text-attention">
            {state.error}
          </span>
        ) : state && !dirty ? (
          <span role="status" className={META}>
            {DESK_DETAIL.saved}
          </span>
        ) : null}
      </div>
    </form>
  );
}
