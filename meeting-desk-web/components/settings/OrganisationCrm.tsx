import { connectOrganisationCrm, disconnectOrganisationCrm } from "@/app/(staff)/account/actions";
import type { CrmAccount } from "@/lib/crm/accountStore";
import { BTN, BTN_PRIMARY, META, SECTION_TITLE } from "@/lib/ui/classes";
import { ORG_CRM } from "./orgCrmContent";

/** The organisation's one shared CRM connection: whether it is connected, and Connect / Reconnect / Disconnect. Admins only. Server component. */
export default function OrganisationCrm({ account, message }: { account: CrmAccount | null; message?: { tone: "good" | "bad"; text: string } }) {
  const connected = account?.status === "connected";

  return (
    <section aria-labelledby="org-crm-title" className="flex min-w-0 flex-col gap-3.5 rounded-panel border border-line bg-card px-7 py-6 max-md:px-4">
      <div>
        <h2 id="org-crm-title" className={SECTION_TITLE}>
          {ORG_CRM.title}
        </h2>
        <p className={`${META} mt-1`}>{ORG_CRM.lede}</p>
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

      {account ? (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-semibold ${
              connected ? "bg-status-booked text-status-booked-text" : "bg-status-needs-info text-status-needs-info-text"
            }`}
          >
            {connected ? ORG_CRM.connectedAs(account.accountEmail) : ORG_CRM.needsReconnect(account.accountEmail)}
          </span>
          <form action={connectOrganisationCrm}>
            <button type="submit" className={connected ? BTN : BTN_PRIMARY}>
              {ORG_CRM.reconnect}
            </button>
          </form>
          <form action={disconnectOrganisationCrm}>
            <button type="submit" className={BTN}>
              {ORG_CRM.disconnect}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <span className="text-[13px] font-semibold text-ink">{ORG_CRM.notConnected}</span>
          <form action={connectOrganisationCrm}>
            <button type="submit" className={BTN_PRIMARY}>
              {ORG_CRM.connect}
            </button>
          </form>
        </div>
      )}
      <p className={`${META} m-0 max-w-[560px]`}>{ORG_CRM.help}</p>
    </section>
  );
}
