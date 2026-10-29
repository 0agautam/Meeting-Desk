import { connectZohoCrm, disconnectCrm } from "@/app/(staff)/account/actions";
import type { CalendarAccount } from "@/lib/calendar/accountStore";
import type { CrmAccount } from "@/lib/crm/accountStore";
import type { Staff } from "@/lib/types";
import { BTN, BTN_PRIMARY, META, SECTION_TITLE } from "@/lib/ui/classes";
import { ACCOUNT_PAGE } from "./accountContent";

/**
 * The "Zoho CRM" section. If Zoho is the person's calendar, that approval already covers the CRM and there is
 * nothing to do; otherwise (Google Calendar) they approve the CRM separately here. Server component.
 */
export default function CrmConnection({
  user,
  calendarAccount,
  crmAccount,
  message,
}: {
  user: Staff;
  calendarAccount: CalendarAccount | null;
  crmAccount: CrmAccount | null;
  message?: { tone: "good" | "bad"; text: string };
}) {
  const viaCalendar = user.calendarProvider === "zoho" && calendarAccount?.status === "connected" && calendarAccount.provider === "zoho";
  const connected = crmAccount?.status === "connected";

  return (
    <section aria-labelledby="crm-title" className="flex flex-col gap-3.5 border-t border-line pt-5">
      <div>
        <h2 id="crm-title" className={SECTION_TITLE}>
          {ACCOUNT_PAGE.crmTitle}
        </h2>
        <p className={`${META} mt-1`}>{ACCOUNT_PAGE.crmLede}</p>
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

      {connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-8 items-center rounded-full bg-status-booked px-3 text-[13px] font-semibold text-status-booked-text">
            {ACCOUNT_PAGE.crmConnected(crmAccount.accountEmail)}
          </span>
          <form action={connectZohoCrm}>
            <button type="submit" className={BTN}>
              {ACCOUNT_PAGE.crmReconnect}
            </button>
          </form>
          <form action={disconnectCrm}>
            <button type="submit" className={BTN}>
              {ACCOUNT_PAGE.disconnect}
            </button>
          </form>
        </div>
      ) : viaCalendar ? (
        <p className={`${META} m-0`}>{ACCOUNT_PAGE.crmViaCalendar}</p>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <span className="text-[13px] font-semibold text-ink">{ACCOUNT_PAGE.crmNotConnected}</span>
          <form action={connectZohoCrm}>
            <button type="submit" className={BTN_PRIMARY}>
              {ACCOUNT_PAGE.crmConnect}
            </button>
          </form>
          <p className={`${META} m-0 max-w-[520px]`}>{ACCOUNT_PAGE.crmConnectHelp(user.email)}</p>
        </div>
      )}
    </section>
  );
}
