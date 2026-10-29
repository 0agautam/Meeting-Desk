import { refreshOrganisationHoursFromCrm, saveOrganisationHours } from "@/app/(staff)/settings/actions";
import { WEEKDAYS } from "@/lib/org/hours";
import { hoursOn } from "@/lib/booking/slots";
import type { WorkingHours } from "@/lib/types";
import { BTN, BTN_PRIMARY, FIELD_INPUT, FIELD_LABEL, META, SECTION_TITLE } from "@/lib/ui/classes";
import { ORG_HOURS } from "./orgHoursContent";
import TimeZonePicker from "./TimeZonePicker";

/** The organisation's time zone and weekday hours, editable by an admin, with a button to copy them again from the CRM. Server component. */
export default function OrganisationHours({
  timezone,
  hours,
  message,
}: {
  timezone: string | null;
  hours: WorkingHours | null;
  message?: { tone: "good" | "bad"; text: string };
}) {
  return (
    <section aria-labelledby="org-hours-title" className="flex min-w-0 flex-col gap-3.5 rounded-panel border border-line bg-card px-7 py-6 max-md:px-4">
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
      {!timezone || !hours ? <p className={`${META} m-0`}>{ORG_HOURS.notSet}</p> : null}

      <form action={saveOrganisationHours} className="flex flex-col gap-4">
        <div>
          <label className={FIELD_LABEL} htmlFor="orgTimezone">
            {ORG_HOURS.timezoneLabel}
          </label>
          <TimeZonePicker initial={timezone} />
          <p className={`${META} mt-1.5`}>{ORG_HOURS.timezoneHelp}</p>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className={FIELD_LABEL}>{ORG_HOURS.hoursLabel}</legend>
          <div className="flex flex-col gap-1.5">
            {WEEKDAYS.map((w) => {
              const working = hours?.days.includes(w.day) ?? (w.day >= 1 && w.day <= 5);
              const day = hours ? hoursOn(hours, w.day) : { start: ORG_HOURS.defaultStart, end: ORG_HOURS.defaultEnd };
              return (
                <div key={w.day} className="flex flex-wrap items-center gap-3">
                  <label className="flex min-h-11 w-36 items-center gap-2 text-sm font-medium text-ink">
                    <input type="checkbox" name={`day_${w.day}`} defaultChecked={working} className="h-4 w-4 accent-accent" />
                    {w.name}
                  </label>
                  <input type="time" name={`start_${w.day}`} defaultValue={day.start} aria-label={ORG_HOURS.startLabel(w.name)} className={`${FIELD_INPUT} w-32`} />
                  <span className={META}>to</span>
                  <input type="time" name={`end_${w.day}`} defaultValue={day.end} aria-label={ORG_HOURS.endLabel(w.name)} className={`${FIELD_INPUT} w-32`} />
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

      <form action={refreshOrganisationHoursFromCrm} className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
        <button type="submit" className={BTN}>
          {ORG_HOURS.refresh}
        </button>
        <p className={`${META} m-0`}>{ORG_HOURS.refreshHelp}</p>
      </form>
    </section>
  );
}
