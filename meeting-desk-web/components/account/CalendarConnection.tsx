import { connectGoogle, connectZoho, disconnectCalendar, saveCalendarProvider } from "@/app/(staff)/account/actions";
import type { CalendarAccount } from "@/lib/calendar/accountStore";
import { calendarEmailOf, type Staff } from "@/lib/types";
import { BTN, BTN_PRIMARY, FIELD_LABEL, FIELD_SELECT, META, SECTION_TITLE } from "@/lib/ui/classes";
import { ACCOUNT_PAGE } from "./accountContent";

/** The "Calendar" section: pick a provider (Zoho or Google), then connect (approve on their own screen) or disconnect. Server component. */
export default function CalendarConnection({
  user,
  account,
  message,
}: {
  user: Staff;
  account: CalendarAccount | null;
  /** The banner for a ?zoho= / ?google= result, already worded. */
  message?: { tone: "good" | "bad"; text: string };
}) {
  const connected = account !== null && account.status === "connected" && account.provider === user.calendarProvider;
  const connect = user.calendarProvider === "google" ? connectGoogle : connectZoho;

  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-3.5 border-t border-line pt-5">
      <div>
        <h2 id="calendar-title" className={SECTION_TITLE}>
          {ACCOUNT_PAGE.calendarTitle}
        </h2>
        <p className={`${META} mt-1`}>{ACCOUNT_PAGE.calendarLede}</p>
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

      <form action={saveCalendarProvider} className="flex flex-wrap items-end gap-3">
        <div>
          <label className={FIELD_LABEL} htmlFor="calendarProvider">
            {ACCOUNT_PAGE.providerLabel}
          </label>
          <select id="calendarProvider" name="calendarProvider" defaultValue={user.calendarProvider ?? ""} className={`${FIELD_SELECT} w-60`}>
            {user.calendarProvider ? null : <option value="">{ACCOUNT_PAGE.providerNone}</option>}
            <option value="zoho">{ACCOUNT_PAGE.providerZoho}</option>
            <option value="google">{ACCOUNT_PAGE.providerGoogle}</option>
          </select>
        </div>
        <button type="submit" className={BTN}>
          {ACCOUNT_PAGE.saveProvider}
        </button>
        <p className={`${META} m-0 basis-full`}>{ACCOUNT_PAGE.providerHelp}</p>
      </form>

      {user.calendarProvider ? (
        connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-8 items-center rounded-full bg-status-booked px-3 text-[13px] font-semibold text-status-booked-text">
              {ACCOUNT_PAGE.connected(account.accountEmail)}
            </span>
            <form action={connect}>
              <button type="submit" className={BTN}>
                {ACCOUNT_PAGE.reconnect}
              </button>
            </form>
            <form action={disconnectCalendar}>
              <button type="submit" className={BTN}>
                {ACCOUNT_PAGE.disconnect}
              </button>
            </form>
            <p className={`${META} m-0 basis-full max-w-[520px]`}>{ACCOUNT_PAGE.reconnectHelp}</p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <span className="text-[13px] font-semibold text-ink">{ACCOUNT_PAGE.notConnected}</span>
            <form action={connect}>
              <button type="submit" className={BTN_PRIMARY}>
                {user.calendarProvider === "google" ? ACCOUNT_PAGE.connectGoogle : ACCOUNT_PAGE.connect}
              </button>
            </form>
            <p className={`${META} m-0 max-w-[520px]`}>
              {user.calendarProvider === "google" ? ACCOUNT_PAGE.connectHelpGoogle(calendarEmailOf(user)) : ACCOUNT_PAGE.connectHelp(calendarEmailOf(user))}
            </p>
          </div>
        )
      ) : (
        <p className={`${META} m-0`}>{ACCOUNT_PAGE.pickProviderFirst}</p>
      )}
    </section>
  );
}
