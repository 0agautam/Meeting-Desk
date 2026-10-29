import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import type { RequestDraft } from "@/lib/data/store";
import type { MeetingRequest } from "@/lib/types";
import { BTN_PRIMARY, CARD, CARD_DRAFT, CARD_SELECTED, CARD_TITLE, CHIP, CHIP_ACTIVE, META, SECTION_TITLE, SIDEBAR } from "@/lib/ui/classes";
import { DRAFT_CARD, REQUESTS_PAGE } from "./requestsContent";

/** Left column of wireframes 1 and 2: the host's requests with status. Server component. */
export default function RequestsSidebar({
  requests,
  draft,
  currentRequestId,
  status = "all",
}: {
  requests: MeetingRequest[];
  draft?: RequestDraft;
  currentRequestId?: string;
  /** The selected status chip ("all" shows everything). */
  status?: string;
}) {
  const count = (key: string) => (key === "all" ? requests.length : requests.filter((r) => r.status === key).length);
  const visible = status === "all" ? requests : requests.filter((r) => r.status === status);
  // Chips keep you on the request you have open; the filter rides along in the URL.
  const base = currentRequestId ? `/requests/${currentRequestId}` : "/requests";
  const query = status === "all" ? "" : `?status=${status}`;

  return (
    <aside className={SIDEBAR} aria-label={REQUESTS_PAGE.sidebarTitle}>
      <div className="flex items-center justify-between">
        <h2 className={SECTION_TITLE}>{REQUESTS_PAGE.sidebarTitle}</h2>
        <Link href={REQUESTS_PAGE.newRequestCta.href} className={`${BTN_PRIMARY} h-11 px-3 text-[13px]`}>
          {REQUESTS_PAGE.newRequestCta.label}
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={REQUESTS_PAGE.filterLabel}>
        {REQUESTS_PAGE.filters.map((f) => (
          <Link
            key={f.key}
            href={`${base}${f.key === "all" ? "" : `?status=${f.key}`}`}
            aria-current={f.key === status ? "true" : undefined}
            className={f.key === status ? CHIP_ACTIVE : CHIP}
          >
            {f.label} {count(f.key)}
          </Link>
        ))}
      </div>

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {draft ? (
          <li>
            <div className={CARD_DRAFT}>
              <div className="font-semibold text-accent-strong">{DRAFT_CARD.label}</div>
              <div className={META}>{DRAFT_CARD.subtitle(draft.subject)}</div>
            </div>
          </li>
        ) : null}
        {visible.length === 0 ? <li className={META}>{REQUESTS_PAGE.emptyFilter}</li> : null}
        {visible.map((r) => {
          const isCurrent = r.id === currentRequestId;
          return (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}${query}`}
                aria-current={isCurrent ? "page" : undefined}
                className={isCurrent ? CARD_SELECTED : CARD}
              >
                <StatusBadge status={r.status} />
                <div className={`${CARD_TITLE} mt-1.5`}>{r.subject}</div>
                <div className={META}>{r.to[0] ?? "No client email yet"}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
