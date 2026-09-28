import { saveStaffSettings } from "@/app/(staff)/settings/actions";
import type { Staff } from "@/lib/types";
import { BTN, BTN_PRIMARY, FIELD_LABEL, FIELD_SELECT } from "@/lib/ui/classes";
import { BUFFER_OPTIONS, CALENDAR_OPTIONS, SETTINGS_PAGE } from "./settingsContent";

/** Wireframe 4's edit panel: calendar + buffer, Save / Cancel. */
export default function EditStaffPanel({ staff }: { staff: Staff }) {
  return (
    <form action={saveStaffSettings} className="flex w-[520px] max-w-full flex-col gap-3.5 rounded-panel border border-line bg-card px-5 py-4.5 max-md:w-full">
      <input type="hidden" name="staffId" value={staff.id} />
      <div className="font-semibold text-ink">{SETTINGS_PAGE.editTitle(staff.name)}</div>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="calendarProvider">
            {SETTINGS_PAGE.calendarLabel}
          </label>
          <select id="calendarProvider" name="calendarProvider" defaultValue={staff.calendarProvider ?? "google"} className={FIELD_SELECT}>
            {CALENDAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="bufferMin">
            {SETTINGS_PAGE.bufferLabel}
          </label>
          <select id="bufferMin" name="bufferMin" defaultValue={staff.bufferMin} className={FIELD_SELECT}>
            {BUFFER_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2.5">
        <button type="submit" className={BTN_PRIMARY}>
          {SETTINGS_PAGE.save}
        </button>
        <a href="/settings" className={BTN}>
          {SETTINGS_PAGE.cancel}
        </a>
      </div>
    </form>
  );
}
