import { addStaff } from "@/app/(staff)/settings/actions";
import { DEFAULT_BUFFER_MIN } from "@/lib/config";
import { BTN, BTN_PRIMARY, FIELD_INPUT, FIELD_LABEL, FIELD_SELECT } from "@/lib/ui/classes";
import RolesField from "./RolesField";
import { BUFFER_OPTIONS, CALENDAR_OPTIONS, SETTINGS_PAGE } from "./settingsContent";

/** The fields of the "+ Add person" popup (the popup frame and title come from TeamTable). */
export default function AddPersonPanel({ error }: { error?: string }) {
  return (
    <form action={addStaff} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-sm:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="name">
            {SETTINGS_PAGE.nameLabel}
          </label>
          <input id="name" name="name" required autoComplete="off" className={FIELD_INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="email">
            {SETTINGS_PAGE.emailLabel}
          </label>
          <input id="email" name="email" type="email" required autoComplete="off" className={FIELD_INPUT} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="calendarProvider">
            {SETTINGS_PAGE.calendarLabel}
          </label>
          <select id="calendarProvider" name="calendarProvider" defaultValue="zoho" className={FIELD_SELECT}>
            {CALENDAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="bufferBeforeMin">
            {SETTINGS_PAGE.bufferBeforeLabel}
          </label>
          <select id="bufferBeforeMin" name="bufferBeforeMin" defaultValue={DEFAULT_BUFFER_MIN} className={FIELD_SELECT}>
            {BUFFER_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="bufferAfterMin">
            {SETTINGS_PAGE.bufferAfterLabel}
          </label>
          <select id="bufferAfterMin" name="bufferAfterMin" defaultValue={DEFAULT_BUFFER_MIN} className={FIELD_SELECT}>
            {BUFFER_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <RolesField defaultRoles={["host"]} />
      {error ? (
        <p role="alert" className="m-0 rounded-field bg-status-needs-info px-3 py-2 text-[13px] text-attention">
          {SETTINGS_PAGE.errors[error] ?? SETTINGS_PAGE.errors.invalid}
        </p>
      ) : null}
      <div className="flex justify-end gap-2.5 border-t border-line pt-5">
        <a href="/settings" className={BTN}>
          {SETTINGS_PAGE.cancel}
        </a>
        <button type="submit" className={BTN_PRIMARY}>
          {SETTINGS_PAGE.save}
        </button>
      </div>
    </form>
  );
}
