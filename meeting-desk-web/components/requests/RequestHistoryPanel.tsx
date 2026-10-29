import { DESK_DETAIL } from "@/components/desk/deskContent";
import RequestSummary from "@/components/desk/RequestSummary";
import ReplyForm from "@/components/requests/ReplyForm";
import RequestHistory from "@/components/requests/RequestHistory";
import StatusBadge from "@/components/ui/StatusBadge";
import { loadCrmUsersForForm } from "@/lib/crm/users";
import { listStaff } from "@/lib/data";
import type { MeetingRequest, RequestEvent } from "@/lib/types";
import { META, PAGE_TITLE, PANEL } from "@/lib/ui/classes";
import { EVENT_COPY, NEXT_ACTION, REQUEST_DETAIL } from "./requestsContent";

/** Right panel of wireframe 2: header, the coordinator's question + reply (if needs_info), and history. */
export default async function RequestHistoryPanel({ request, events, userId }: { request: MeetingRequest; events: RequestEvent[]; userId: string }) {
  const staff = await listStaff();
  const editable = request.status === "needs_info" || request.status === "new" || request.status === "updated";
  // The edit form needs the CRM's people for the attendee picklist; no point fetching them once the request is locked.
  const crm = editable ? await loadCrmUsersForForm(userId) : { users: [], issue: null, detail: undefined };
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const host = staffById.get(request.hostId);

  const lastQuestion = [...events].reverse().find((e) => e.type === "info_requested");

  return (
    <section className="flex min-w-0 flex-1 gap-5 max-lg:flex-col lg:min-h-0">
      <div className={`${PANEL} lg:min-h-0 lg:overflow-y-auto`}>
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            <span className={META}>
              Request #{request.id.slice(-6)} · version {request.version}
            </span>
          </div>
          <h1 className={`${PAGE_TITLE} mt-1.5`}>{request.subject}</h1>
        </div>

        <RequestSummary request={request} host={host} title={DESK_DETAIL.summaryTitleForHost} />

        {request.status === "needs_info" && lastQuestion ? (
          <div className="flex flex-col gap-1 rounded-card bg-status-needs-info px-4 py-3.5">
            <div className="text-xs font-semibold text-status-needs-info-text">{REQUEST_DETAIL.questionTitle}</div>
            <div className="text-ink">{lastQuestion.message}</div>
          </div>
        ) : null}

        {editable ? (
          <ReplyForm
            request={request}
            key={`${request.id}-${request.version}`}
            hostName={host?.name}
            hostEmail={host?.email}
            crmUsers={crm.users}
            crmUsersIssue={crm.issue}
            crmUsersDetail={crm.detail}
          />
        ) : NEXT_ACTION[request.status] ? (
          <p className={META}>{NEXT_ACTION[request.status]}</p>
        ) : null}
        </div>
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
