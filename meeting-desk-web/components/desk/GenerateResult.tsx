"use client";

import { askForInfo, type GenerateEmailState } from "@/app/(staff)/desk/[id]/actions";
import { BTN, FIELD_LABEL, FIELD_TEXTAREA } from "@/lib/ui/classes";
import { DESK_DETAIL } from "./deskContent";

/**
 * What Generate email (or Save and regenerate) answered: an error or notice for the coordinator and, when what the
 * notes asked for isn't available, a ready-made question to the host that she can edit and send ("needs info").
 * Kept outside the forms that start the calendar lookup, because forms can't be nested.
 */
export default function GenerateResult({ state, requestId, hostName }: { state: GenerateEmailState; requestId: string; hostName: string }) {
  if (!state) return null;
  const text = "error" in state ? state.error : state.notice;

  return (
    <div className="flex max-w-[520px] flex-col gap-2">
      <p role={"error" in state ? "alert" : "status"} className="m-0 rounded-field bg-status-needs-info px-3 py-2 text-xs text-attention">
        {text}
      </p>
      {state.askMessage ? (
        <form key={state.askMessage} action={askForInfo} className="flex flex-col gap-1.5">
          <input type="hidden" name="requestId" value={requestId} />
          <label className={FIELD_LABEL} htmlFor={`ask-times-${requestId}`}>
            {DESK_DETAIL.askAboutTimesLabel(hostName)}
          </label>
          <textarea id={`ask-times-${requestId}`} name="message" required rows={3} defaultValue={state.askMessage} className={FIELD_TEXTAREA} />
          <div>
            <button type="submit" className={BTN}>
              {DESK_DETAIL.askAboutTimes(hostName)}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
