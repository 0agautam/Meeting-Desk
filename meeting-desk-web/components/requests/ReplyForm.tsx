"use client";

import { useState } from "react";
import { resubmitRequest } from "@/app/(staff)/requests/[id]/actions";
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
import { DURATION_OPTIONS } from "./requestsContent";
import { REQUEST_DETAIL } from "./requestsContent";

/** Wireframe 2's reply box: reply text + editable To/Cc/Duration, highlighted when changed. */
export default function ReplyForm({ request }: { request: MeetingRequest }) {
  const originalTo = request.to.join(", ");
  const originalCc = request.cc.join(", ");
  const [to, setTo] = useState(originalTo);
  const [cc, setCc] = useState(originalCc);
  const [durationMin, setDurationMin] = useState(request.durationMin);

  const toChanged = to.trim() !== originalTo.trim();
  const ccChanged = cc.trim() !== originalCc.trim();
  const durationChanged = durationMin !== request.durationMin;

  return (
    <form action={resubmitRequest} className="flex flex-col gap-3 rounded-card border border-line p-4">
      <input type="hidden" name="requestId" value={request.id} />
      <div className={CARD_TITLE}>{REQUEST_DETAIL.replyTitle}</div>
      <textarea
        name="message"
        required
        aria-label={REQUEST_DETAIL.replyLabel}
        rows={3}
        className={FIELD_TEXTAREA}
        style={{ minHeight: "72px" }}
        placeholder={REQUEST_DETAIL.replyRequired}
      />
      <div className="text-xs font-semibold text-ink">{REQUEST_DETAIL.updateLabel}</div>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="to">
            {REQUEST_DETAIL.toLabel}
          </label>
          <input
            id="to"
            name="to"
            className={toChanged ? FIELD_INPUT_CHANGED : FIELD_INPUT}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="cc">
            {REQUEST_DETAIL.ccLabel}
          </label>
          <input
            id="cc"
            name="cc"
            className={ccChanged ? FIELD_INPUT_CHANGED : FIELD_INPUT}
            value={cc}
            onChange={(e) => setCc(e.target.value)}
          />
        </div>
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
          {REQUEST_DETAIL.resubmit}
        </button>
        <span className={META}>{REQUEST_DETAIL.resubmitHelp(request.version + 1)}</span>
      </div>
    </form>
  );
}
