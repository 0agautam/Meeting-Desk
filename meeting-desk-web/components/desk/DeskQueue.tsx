import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import type { MeetingRequest, Staff } from "@/lib/types";
import { CARD, CARD_TITLE, META, SIDEBAR } from "@/lib/ui/classes";
import { formatAgo } from "@/lib/ui/formatDateTime";

/** Left queue of wireframe 3. Server component. */
export default function DeskQueue({
  requests,
  staff,
  activeId,
  query = "",
}: {
  requests: MeetingRequest[];
  staff: Staff[];
  activeId?: string;
  /** The desk's current filters (see deskQuery), kept on the link so opening a request doesn't reset them. */
  query?: string;
}) {
  const hostName = (id: string) => staff.find((s) => s.id === id)?.name ?? "Unknown";

  return (
    <section className={SIDEBAR} aria-label="Request queue">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {requests.map((r) => (
          <li key={r.id}>
            <Link
              href={`/desk/${r.id}${query}`}
              aria-current={r.id === activeId ? "page" : undefined}
              className={`${CARD} hover:border-accent ${r.id === activeId ? "border-2 border-accent" : ""}`}
            >
              <StatusBadge status={r.status} />
              <div className={`${CARD_TITLE} mt-1`}>{r.subject}</div>
              <div className={META}>
                {r.to[0] ?? "No client email yet"} · {r.durationMin} min · host {hostName(r.hostId)}
              </div>
              <div className={META}>Submitted {formatAgo(r.createdAt)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
