import type { Metadata } from "next";
import { saveMyBuffer } from "@/app/(staff)/account/actions";
import { ACCOUNT_PAGE, CRM_MESSAGES, GOOGLE_MESSAGES, ZOHO_MESSAGES } from "@/components/account/accountContent";
import CalendarConnection from "@/components/account/CalendarConnection";
import CrmConnection from "@/components/account/CrmConnection";
import { BUFFER_OPTIONS } from "@/components/settings/settingsContent";
import { requireUser } from "@/lib/auth/current-user";
import { roleLabel } from "@/lib/auth/permissions";
import { getCalendarAccount } from "@/lib/calendar/accountStore";
import { getCrmAccount } from "@/lib/crm/accountStore";
import { BTN, FIELD_LABEL, FIELD_SELECT, META, PAGE_BODY, PAGE_LEDE, PAGE_TITLE, PANEL, SECTION_TITLE } from "@/lib/ui/classes";

export const metadata: Metadata = { title: ACCOUNT_PAGE.metaTitle };

/** "My settings": every signed-in person manages their own calendar connection (and, for hosts, their buffer). */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser();
  const { zoho, google, crm, as } = await searchParams;
  const [account, crmAccount] = await Promise.all([getCalendarAccount(user.id), getCrmAccount(user.id)]);

  // The banner for whichever approval the person just came back from.
  const banner = (value: string | string[] | undefined, messages: typeof ZOHO_MESSAGES) => {
    const message = typeof value === "string" ? messages[value] : undefined;
    return message ? { tone: message.tone, text: message.text(typeof as === "string" ? as : undefined, user.email) } : undefined;
  };
  const calendarMessage = banner(zoho, ZOHO_MESSAGES) ?? banner(google, GOOGLE_MESSAGES);
  const crmMessage = banner(crm, CRM_MESSAGES);

  return (
    <div className={PAGE_BODY}>
      <section className={`${PANEL} mx-auto flex max-w-[760px] flex-col gap-5`}>
        <div>
          <h1 className={PAGE_TITLE}>{ACCOUNT_PAGE.title}</h1>
          <p className={PAGE_LEDE}>
            {user.name} · {roleLabel(user.roles)}. {ACCOUNT_PAGE.lede(user.email)}
          </p>
        </div>

        <CalendarConnection user={user} account={account} message={calendarMessage} />

        {user.roles.includes("host") || user.roles.includes("admin") ? (
          <CrmConnection user={user} calendarAccount={account} crmAccount={crmAccount} message={crmMessage} />
        ) : null}

        {user.roles.includes("host") ? (
          <section aria-labelledby="buffer-title" className="flex flex-col gap-3 border-t border-line pt-5">
            <h2 id="buffer-title" className={SECTION_TITLE}>
              {ACCOUNT_PAGE.bufferTitle}
            </h2>
            <form action={saveMyBuffer} className="flex flex-wrap items-end gap-3">
              <div>
                <label className={FIELD_LABEL} htmlFor="bufferMin">
                  {ACCOUNT_PAGE.bufferLabel}
                </label>
                <select id="bufferMin" name="bufferMin" defaultValue={user.bufferMin} className={`${FIELD_SELECT} w-60`}>
                  {BUFFER_OPTIONS.map((o) => (
                    <option key={o.minutes} value={o.minutes}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={BTN}>
                {ACCOUNT_PAGE.saveBuffer}
              </button>
              <p className={`${META} m-0 basis-full`}>{ACCOUNT_PAGE.bufferHelp}</p>
            </form>
          </section>
        ) : null}
      </section>
    </div>
  );
}
