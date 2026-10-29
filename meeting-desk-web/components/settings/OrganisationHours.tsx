import { refreshOrganisationHoursFromCrm, saveOrganisationHours } from "@/app/(staff)/settings/actions";
import { hoursOn } from "@/lib/booking/slots";
import { WEEKDAYS, summarizeHours, timeZoneLabel } from "@/lib/org/hours";
import type { WorkingHours } from "@/lib/types";
import { BTN, BTN_PRIMARY, FIELD_LABEL, META, SECTION_TITLE } from "@/lib/ui/classes";
import { ORG_HOURS } from "./orgHoursContent";
import TimeZonePicker from "./TimeZonePicker";

// The shared field style is full width, so the time boxes get their own.
const TIME_BOX = "box-border h-10 w-28 rounded-field border border-field-line bg-field px-2 text-ink";

/**
 * The organisation's time zone and weekday hours: a one-line summary, with Edit (a small form) and Refresh from CRM.
 * The form is open from the start while nothing is saved, or after a failed save. Server component.
 */
export default function OrganisationHours({
  timezone,
  hours,
  message,
}: {
  timezone: string | null;
  hours: WorkingHours | null;
  message?: { tone: "good" | "bad"; text: string };
}) {
  const isSet = !!timezone && !!hours;

  return (
    <section aria-labelledby="org-hours-title" className="flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-card px-7 py-6 max-md:px-4">
      <div>
        <h2 id="org-hours-title" className={SECTION_TITLE}>
          {ORG_HOURS.title}
        </h2>
        <p className={`${META} mt-1`}>{ORG_HOURS.lede}</p>
      </div>

      {message ? (
        <p
          role="status"
          className={`m-0 rounded-card px-3.5 py-2.5 text-[13px] ${
            message.tone === "good" ? "bg-status-booked text-status-booked-text" : "bg-status-needs-info text-status-needs-info-text"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {isSet ? (
        <p className="m-0 text-[15px] font-semibold text-ink">
          {summarizeHours(hours)} <span className="font-normal text-muted">· {timeZoneLabel(timezone)}</span>
        </p>
      ) : (
        <p className={`${META} m-0`}>{ORG_HOURS.notSet}</p>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <details open={!isSet || message?.tone === "bad"} className="group min-w-0 flex-1 basis-full">
          <summary className={`${BTN} cursor-pointer list-none`}>{isSet ? ORG_HOURS.edit : ORG_HOURS.set}</summary>

          <form action={saveOrganisationHours} className="mt-3 flex max-w-md flex-col gap-4 rounded-card border border-line p-4">
            <div>
              <label className={FIELD_LABEL} htmlFor="orgTimezone">
                {ORG_HOURS.timezoneLabel}
              </label>
              <TimeZonePicker initial={timezone} />
              <p className={`${META} mt-1.5`}>{ORG_HOURS.timezoneHelp}</p>
            </div>

            <fieldset className="m-0 border-0 p-0">
              <legend className={FIELD_LABEL}>{ORG_HOURS.hoursLabel}</legend>
              <div className="flex flex-col">
                {WEEKDAYS.map((w) => {
                  const working = hours?.days.includes(w.day) ?? (w.day >= 1 && w.day <= 5);
                  const day = hours ? hoursOn(hours, w.day) : { start: ORG_HOURS.defaultStart, end: ORG_HOURS.defaultEnd };
                  return (
                    <div key={w.day} className="flex items-center gap-2 border-b border-line py-0.5 last:border-b-0">
                      <label className="flex min-h-11 w-32 shrink-0 items-center gap-2 text-sm font-medium text-ink">
                        <input type="checkbox" name={`day_${w.day}`} defaultChecked={working} className="h-4 w-4 accent-accent" />
                        {w.name}
                      </label>
                      <input type="time" name={`start_${w.day}`} defaultValue={day.start} aria-label={ORG_HOURS.startLabel(w.name)} className={TIME_BOX} />
                      <span className={META}>to</span>
                      <input type="time" name={`end_${w.day}`} defaultValue={day.end} aria-label={ORG_HOURS.endLabel(w.name)} className={TIME_BOX} />
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <button type="submit" className={BTN_PRIMARY}>
                {ORG_HOURS.save}
              </button>
            </div>
          </form>
        </details>

        <form action={refreshOrganisationHoursFromCrm} className="flex flex-wrap items-center gap-3">
          <button type="submit" className={BTN}>
            {ORG_HOURS.refresh}
          </button>
          <p className={`${META} m-0`}>{ORG_HOURS.refreshHelp}</p>
        </form>
      </div>
    </section>
  );
}
