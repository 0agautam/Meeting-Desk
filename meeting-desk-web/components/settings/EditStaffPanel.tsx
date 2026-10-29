import { deleteStaffAndData, deleteStaffMember, saveStaffSettings } from "@/app/(staff)/settings/actions";
import type { Staff } from "@/lib/types";
import { BTN, BTN_PRIMARY, FIELD_INPUT, FIELD_LABEL, FIELD_SELECT } from "@/lib/ui/classes";
import RolesField from "./RolesField";
import { BUFFER_OPTIONS, CALENDAR_OPTIONS, SETTINGS_PAGE } from "./settingsContent";

/** The fields of the Edit popup (roles, calendar, buffer), then the delete section; the popup frame and title come from TeamTable. */
export default function EditStaffPanel({ staff, error, isSelf, data }: { staff: Staff; error?: string; isSelf: boolean; data: { requests: number; bookings: number } }) {
  const hasData = data.requests > 0 || data.bookings > 0;
  return (
    <div className="flex flex-col gap-6">
      <form action={saveStaffSettings} className="flex flex-col gap-5">
        <input type="hidden" name="staffId" value={staff.id} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-sm:grid-cols-1">
          <div>
            <label className={FIELD_LABEL} htmlFor="calendarProvider">
              {SETTINGS_PAGE.calendarLabel}
            </label>
            <select id="calendarProvider" name="calendarProvider" defaultValue={staff.calendarProvider ?? ""} className={FIELD_SELECT}>
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
            <select id="bufferBeforeMin" name="bufferBeforeMin" defaultValue={staff.bufferBeforeMin} className={FIELD_SELECT}>
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
            <select id="bufferAfterMin" name="bufferAfterMin" defaultValue={staff.bufferAfterMin} className={FIELD_SELECT}>
              {BUFFER_OPTIONS.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="slug">
            {SETTINGS_PAGE.slugLabel}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">/book/</span>
            <input id="slug" name="slug" defaultValue={staff.slug} maxLength={40} autoComplete="off" className={FIELD_INPUT} />
          </div>
          <p className="m-0 mt-1.5 text-xs text-muted">{SETTINGS_PAGE.slugHelp}</p>
        </div>
        <RolesField defaultRoles={staff.roles} />
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

      {/* Native <details> is the confirm step: nothing is deleted until the second, red button is pressed. */}
      <div className="rounded-card border border-line bg-ground px-4 py-1">
        {isSelf ? (
          <p className="m-0 py-3 text-[13px] text-muted">{SETTINGS_PAGE.deleteSelf}</p>
        ) : hasData ? (
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-[13px] font-semibold text-attention">
              {SETTINGS_PAGE.deleteDataTitle}
            </summary>
            <form action={deleteStaffAndData} className="flex flex-col gap-3 pb-4">
              <input type="hidden" name="staffId" value={staff.id} />
              <p role="alert" className="m-0 rounded-field bg-status-needs-info px-3 py-2 text-[13px] font-semibold text-attention">
                {SETTINGS_PAGE.deleteDataWarning(staff.name, data.requests, data.bookings)}
              </p>
              <p className="m-0 text-[13px] text-body">{SETTINGS_PAGE.deleteDataKept}</p>
              <p className="m-0 text-[13px] text-muted">{SETTINGS_PAGE.deleteDataKeepInstead}</p>
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] text-ink">
                <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{SETTINGS_PAGE.deleteDataConfirm}</span>
              </label>
              <div>
                <button
                  type="submit"
                  className="inline-flex h-11 cursor-pointer items-center rounded-field border border-attention bg-attention px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  {SETTINGS_PAGE.deleteDataButton}
                </button>
              </div>
            </form>
          </details>
        ) : (
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-[13px] font-semibold text-attention">
              {SETTINGS_PAGE.deleteTitle}
            </summary>
            <form action={deleteStaffMember} className="flex flex-col gap-3 pb-4">
              <input type="hidden" name="staffId" value={staff.id} />
              <p className="m-0 text-[13px] text-body">{SETTINGS_PAGE.deleteHelp(staff.name)}</p>
              <div>
                <button
                  type="submit"
                  className="inline-flex h-11 cursor-pointer items-center rounded-field border border-attention bg-attention px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  {SETTINGS_PAGE.deleteButton}
                </button>
              </div>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}
