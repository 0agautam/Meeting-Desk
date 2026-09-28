import { markAsSent } from "@/app/(staff)/desk/[id]/actions";
import AskInfoForm from "@/components/desk/AskInfoForm";
import CopyEmailButton from "@/components/desk/CopyEmailButton";
import RequestHistory from "@/components/requests/RequestHistory";
import StatusBadge from "@/components/ui/StatusBadge";
import type { MeetingRequest, RequestEvent, Staff } from "@/lib/types";
import { META, PAGE_TITLE, PANEL } from "@/lib/ui/classes";
import { DESK_DETAIL, DESK_EVENT_COPY, DESK_NEXT_ACTION, DESK_PAGE, buildEmailDraft } from "./deskContent";

function formatFieldValue(key: string, value: unknown): string {
  if (key === "durationMin") return `${value} min`;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
  return String(value ?? "none");
}

/** Right panel of wireframe 3: changed-since, email draft, actions, and history. Server component. */
export default function DeskDetailPanel({
  request,
  events,
  staff,
}: {
  request?: MeetingRequest;
  events: RequestEvent[];
  staff: Staff[];
}) {
  if (!request) {
    return (
      <section className={`${PANEL} flex flex-col gap-4`}>
        <h1 className={PAGE_TITLE}>{DESK_PAGE.emptyState}</h1>
      </section>
    );
  }

  const staffById = new Map(staff.map((s) => [s.id, s]));
  const host = staffById.get(request.hostId);
  const attendeeNames = [request.hostId, ...request.attendees.map((a) => a.staffId)]
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .map((id) => staffById.get(id)?.name)
    .filter(Boolean)
    .join(", ");

  const lastReply = [...events].reverse().find((e) => e.type === "host_replied" && e.version === request.version);
  const canAct = request.status === "new" || request.status === "updated";

  const draft = buildEmailDraft({
    clientEmail: request.to[0],
    hostName: host?.name ?? "the host",
    hostSlug: host?.slug ?? "",
    subject: request.subject,
    durationMin: request.durationMin,
  });

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
            Host {host?.name ?? "—"} · {attendeeNames}
            {request.crmAccount ? ` · CRM: ${request.crmAccount}` : ""}
          </div>
        </div>

        {request.status === "updated" && lastReply?.changes ? (
          <div className="flex flex-col gap-1.5 rounded-card border border-accent-line bg-accent-soft px-3.5 py-2.5">
            <div className="text-xs font-semibold text-accent-strong">{DESK_DETAIL.changedTitle}</div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {Object.entries(lastReply.changes).map(([key, change]) => (
                <span key={key} className="rounded-md border border-accent-line bg-card px-2 py-1">
                  {DESK_DETAIL.fieldLabels[key] ?? key}:{" "}
                  <s className="text-muted">{formatFieldValue(key, change.from)}</s> → {formatFieldValue(key, change.to)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {canAct ? (
          <>
            <div className="flex flex-col overflow-hidden rounded-card border border-line">
              <div className="flex items-center justify-between bg-ground px-3.5 py-2.5 text-[13px]">
                <span>
                  <span className="text-muted">{DESK_DETAIL.emailHeaderLabel} · To</span> {request.to[0] ?? "no client email yet"}
                  {request.cc.length ? (
                    <>
                      {" "}
                      <span className="text-muted">Cc</span> {request.cc.join(", ")}
                    </>
                  ) : null}
                </span>
                <span className="text-xs text-muted">
                  {DESK_DETAIL.subjectLabel}: {request.subject}
                </span>
              </div>
              <div className="whitespace-pre-line px-3.5 py-3 text-[13px] leading-relaxed text-ink">{draft}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CopyEmailButton requestId={request.id} draft={draft} />
              <MarkAsSentButton requestId={request.id} />
              <AskInfoForm requestId={request.id} hostName={host?.name ?? "the host"} />
            </div>
            <p className={META}>{DESK_DETAIL.emailDisclaimer}</p>
          </>
        ) : (
          <p className={META}>{DESK_NEXT_ACTION[request.status]}</p>
        )}
      </div>

      <RequestHistory
        events={events}
        staffById={staffById}
        eventCopy={DESK_EVENT_COPY}
        nextAction={DESK_NEXT_ACTION[request.status]}
        title={DESK_DETAIL.historyTitle}
        footer={DESK_DETAIL.historyFooter}
      />
    </section>
  );
}

function MarkAsSentButton({ requestId }: { requestId: string }) {
  return (
    <form action={markAsSent}>
      <input type="hidden" name="requestId" value={requestId} />
      <button
        type="submit"
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-field border border-field-line bg-card px-[18px] font-semibold text-ink hover:bg-ground"
      >
        {DESK_DETAIL.markAsSent}
      </button>
    </form>
  );
}
