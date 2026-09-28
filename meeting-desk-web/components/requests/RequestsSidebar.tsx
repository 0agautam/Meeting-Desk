import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import type { RequestDraft } from "@/lib/data/store";
import type { MeetingRequest } from "@/lib/types";
import { BTN_PRIMARY, CARD, CARD_DRAFT, CARD_TITLE, CHIP, CHIP_ACTIVE, META, SECTION_TITLE, SIDEBAR } from "@/lib/ui/classes";
import { DRAFT_CARD, REQUESTS_PAGE } from "./requestsContent";

/** Left column of wireframes 1 and 2: the host's requests with status. Server component. */
export default function RequestsSidebar({
  requests,
  draft,
  currentRequestId,
}: {
  requests: MeetingRequest[];
  draft?: RequestDraft;
  currentRequestId?: string;
}) {
  const open = requests.filter((r) => r.status !== "booked").length;
  const booked = requests.length - open;
  const counts = { open, booked, all: requests.length };

  return (
    <aside className={SIDEBAR} aria-label={REQUESTS_PAGE.sidebarTitle}>
      <div className="flex items-center justify-between">
        <h2 className={SECTION_TITLE}>{REQUESTS_PAGE.sidebarTitle}</h2>
        <Link href={REQUESTS_PAGE.newRequestCta.href} className={`${BTN_PRIMARY} h-11 px-3 text-[13px]`}>
          {REQUESTS_PAGE.newRequestCta.label}
        </Link>
      </div>

      {/* TODO (wireframe 1): make the filters work (searchParams or client state). */}
      <div className="flex gap-1.5">
        {REQUESTS_PAGE.filters.map((f, i) => (
          <span key={f.key} className={i === 0 ? CHIP_ACTIVE : CHIP}>
            {f.label} {counts[f.key]}
          </span>
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
        {requests.map((r) => {
          const isCurrent = r.id === currentRequestId;
          return (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`${CARD} hover:border-accent ${isCurrent ? "border-2 border-accent" : ""}`}
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
