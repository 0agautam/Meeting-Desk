"use client";

import { useActionState } from "react";
import { saveConstraints, type GenerateEmailState } from "@/app/(staff)/desk/[id]/actions";
import { WEEKDAY_NAMES, describeConstraints } from "@/lib/booking/constraints";
import type { SchedulingConstraints } from "@/lib/types";
import { BTN, BTN_PRIMARY, FIELD_INPUT, FIELD_LABEL, FIELD_SELECT, FIELD_TEXTAREA, META } from "@/lib/ui/classes";
import { DESK_DETAIL } from "./deskContent";
import GenerateResult from "./GenerateResult";

/** Monday first for reading; the values are Date#getDay numbers (Sunday = 0). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * "What I understood from the notes": the timing constraints the AI found, editable by the coordinator.
 * Saving only stores them; "Save and regenerate" also offers new times and a new email that follow them.
 */
export default function ConstraintsPanel({ requestId, hostName, constraints }: { requestId: string; hostName: string; constraints: SchedulingConstraints }) {
  const [state, formAction, pending] = useActionState<GenerateEmailState, FormData>(saveConstraints, null);
  const understood = describeConstraints(constraints);

  return (
    <>
    {/* Keyed by the saved values, so a fresh reading (or a save) refills the fields. */}
    <form key={JSON.stringify(constraints)} action={formAction} className="flex flex-col gap-3 rounded-card border border-line bg-card px-3.5 py-3 text-[13px]">
      <input type="hidden" name="requestId" value={requestId} />
      <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.04em] text-muted">{DESK_DETAIL.constraintsTitle}</h2>
      <p className="m-0 text-ink">{understood.length ? understood.join(" · ") : DESK_DETAIL.constraintsNone}</p>
      <p className={`${META} m-0`}>{DESK_DETAIL.constraintsHelp}</p>

      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="earliestDate">
            {DESK_DETAIL.earliestLabel}
          </label>
          <input id="earliestDate" name="earliestDate" type="date" defaultValue={constraints.earliestDate ?? ""} className={FIELD_INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="latestDate">
            {DESK_DETAIL.latestLabel}
          </label>
          <input id="latestDate" name="latestDate" type="date" defaultValue={constraints.latestDate ?? ""} className={FIELD_INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="timeOfDay">
            {DESK_DETAIL.timeOfDayLabel}
          </label>
          <select id="timeOfDay" name="timeOfDay" defaultValue={constraints.timeOfDay} className={FIELD_SELECT}>
            {Object.entries(DESK_DETAIL.timeOfDayOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="m-0 border-0 p-0">
          <legend className={FIELD_LABEL}>{DESK_DETAIL.avoidLabel}</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {WEEKDAY_ORDER.map((day) => (
              <label key={day} className="flex items-center gap-1.5 text-ink">
                <input type="checkbox" name="avoid" value={day} defaultChecked={constraints.avoidWeekdays.includes(day)} />
                {WEEKDAY_NAMES[day].slice(0, 3)}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className={FIELD_LABEL} htmlFor="notBeforeTime">
            {DESK_DETAIL.notBeforeLabel}
          </label>
          <input id="notBeforeTime" name="notBeforeTime" type="time" defaultValue={constraints.notBeforeTime ?? ""} className={FIELD_INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="notAfterTime">
            {DESK_DETAIL.notAfterLabel}
          </label>
          <input id="notAfterTime" name="notAfterTime" type="time" defaultValue={constraints.notAfterTime ?? ""} className={FIELD_INPUT} />
        </div>
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="urgency">
          {DESK_DETAIL.urgencyLabel}
        </label>
        <select id="urgency" name="urgency" defaultValue={constraints.urgency} className={FIELD_SELECT}>
          {Object.entries(DESK_DETAIL.urgencyOptions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={FIELD_LABEL} htmlFor="other">
          {DESK_DETAIL.otherLabel}
        </label>
        <textarea id="other" name="other" rows={2} defaultValue={constraints.other} className={FIELD_TEXTAREA} style={{ minHeight: "56px" }} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" name="intent" value="regenerate" disabled={pending} className={`${BTN_PRIMARY} disabled:cursor-wait disabled:opacity-70`}>
          {pending ? DESK_DETAIL.working : DESK_DETAIL.saveAndRegenerate}
        </button>
        <button type="submit" name="intent" value="save" disabled={pending} className={BTN}>
          {DESK_DETAIL.saveConstraints}
        </button>
        <button type="submit" name="intent" value="reread" disabled={pending} formNoValidate className={BTN}>
          {DESK_DETAIL.rereadNotes}
        </button>
      </div>
    </form>
    <GenerateResult state={state} requestId={requestId} hostName={hostName} />
    </>
  );
}
