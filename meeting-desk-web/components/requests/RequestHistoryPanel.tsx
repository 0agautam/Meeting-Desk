import ReplyForm from "@/components/requests/ReplyForm";
import RequestHistory from "@/components/requests/RequestHistory";
import StatusBadge from "@/components/ui/StatusBadge";
import { listStaff } from "@/lib/data";
import type { MeetingRequest, RequestEvent } from "@/lib/types";
import { META, PAGE_TITLE, PANEL } from "@/lib/ui/classes";
import { EVENT_COPY, NEXT_ACTION, REQUEST_DETAIL } from "./requestsContent";

/** Right panel of wireframe 2: header, Celian's question + reply (if needs_info), and history. */
export default async function RequestHistoryPanel({ request, events }: { request: MeetingRequest; events: RequestEvent[] }) {
  const staff = await listStaff();
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const host = staffById.get(request.hostId);

  const lastQuestion = [...events].reverse().find((e) => e.type === "info_requested");

  return (
    <section className={`${PANEL} flex gap-6 max-md:flex-col`}>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <span className={META}>
              Request #{request.id.slice(-6)} · version {request.version}
            </span>
          </div>
          <h1 className={`${PAGE_TITLE} mt-1.5`}>{request.subject}</h1>
          <div className={META}>
            Host {host?.name ?? "—"} · {request.durationMin} min · To {request.to[0] ?? "no client email yet"}
          </div>
        </div>

        {request.status === "needs_info" && lastQuestion ? (
          <div className="flex flex-col gap-1 rounded-card bg-status-needs-info px-4 py-3.5">
            <div className="text-xs font-semibold text-status-needs-info-text">{REQUEST_DETAIL.questionTitle}</div>
            <div className="text-ink">{lastQuestion.message}</div>
          </div>
        ) : null}

        {request.status === "needs_info" ? (
          <ReplyForm request={request} />
        ) : NEXT_ACTION[request.status] ? (
          <p className={META}>{NEXT_ACTION[request.status]}</p>
        ) : null}
      </div>

      <RequestHistory
        events={events}
        staffById={staffById}
        eventCopy={EVENT_COPY}
        nextAction={NEXT_ACTION[request.status]}
        title={REQUEST_DETAIL.historyTitle}
        footer={REQUEST_DETAIL.historyFooter}
      />
    </section>
  );
}
