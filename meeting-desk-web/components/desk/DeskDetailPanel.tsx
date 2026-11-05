import { markAsBooked, markAsSent, releaseRequestHolds } from "@/app/(staff)/desk/[id]/actions";
import AskInfoForm from "@/components/desk/AskInfoForm";
import ConstraintsPanel from "@/components/desk/ConstraintsPanel";
import EmailEditor from "@/components/desk/EmailEditor";
import GenerateEmailButton from "@/components/desk/GenerateEmailButton";
import RequestSummary from "@/components/desk/RequestSummary";
import RequestHistory from "@/components/requests/RequestHistory";
import StatusBadge from "@/components/ui/StatusBadge";
import type { EmailDraft, MeetingRequest, RequestEvent, Staff } from "@/lib/types";
import { META, PAGE_TITLE, PANEL } from "@/lib/ui/classes";
import {
  DESK_DETAIL,
  DESK_EVENT_COPY,
  DESK_NEXT_ACTION,
  DESK_PAGE,
  buildEmailDraft,
  formatSlot,
  timeZoneLabel,
} from "./deskContent";

function formatFieldValue(key: string, value: unknown): string {
  if (key === "durationMin") return `${value} min`;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
  return String(value ?? "none");
}

/** Right panel of wireframe 3: what the host sent, generate-the-email, actions, and history. Server component. */
export default function DeskDetailPanel({
  request,
  events,
  staff,
  coordinatorName = "The coordinator",
}: {
  request?: MeetingRequest;
  events: RequestEvent[];
  staff: Staff[];
  /** The signed-in coordinator — the name the email is written from. */
  coordinatorName?: string;
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
  const timeZone = host?.timezone ?? "America/Toronto";

  const lastReply = [...events].reverse().find((e) => (e.type === "host_replied" || e.type === "host_edited") && e.version === request.version);
  const canAct = request.status === "new" || request.status === "updated";
  const hasTimes = request.offeredSlots.length > 0;
  const hasHolds = request.offeredSlots.some((s) => s.holdEventId);

  // The saved email; a request generated before emails were saved gets one rebuilt from its offered times.
  const draft: EmailDraft | null =
    request.emailDraft ??
    (hasTimes
      ? {
          subject: request.subject,
          to: request.to,
          cc: request.cc,
          body: buildEmailDraft({ clientEmail: request.to[0], coordinatorName, slots: request.offeredSlots, timeZone }),
        }
      : null);

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

        <RequestSummary request={request} host={host} />

        {canAct && request.constraints ? <ConstraintsPanel requestId={request.id} hostName={host?.name ?? "the host"} constraints={request.constraints} /> : null}

        {hasTimes ? (
          <section aria-label={DESK_DETAIL.offeredTitle} className="flex flex-col gap-1.5 rounded-card border border-line bg-card px-3.5 py-3 text-[13px]">
            <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.04em] text-muted">{DESK_DETAIL.offeredTitle}</h2>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-ink">
              {request.offeredSlots.map((slot) => (
                <li key={slot.startUtc}>{formatSlot(slot, timeZone)}</li>
              ))}
            </ul>
            <p className={`${META} m-0`}>{DESK_DETAIL.offeredNote(timeZoneLabel(timeZone))}</p>
            {hasHolds ? (
              <>
                <p className={`${META} m-0`}>{DESK_DETAIL.holdsNote}</p>
                <form action={releaseRequestHolds} className="mt-1">
                  <input type="hidden" name="requestId" value={request.id} />
                  <button
                    type="submit"
                    className="inline-flex h-11 cursor-pointer items-center justify-center rounded-field border border-field-line bg-card px-[18px] font-semibold text-ink hover:bg-ground"
                  >
                    {DESK_DETAIL.releaseHolds}
                  </button>
                </form>
              </>
            ) : null}
          </section>
        ) : null}

        {draft ? <EmailEditor requestId={request.id} draft={draft} /> : null}
        {draft && (request.status === "email_sent" || request.status === "booked") ? <p className={META}>{DESK_DETAIL.sentNote}</p> : null}

        {canAct ? (
          <div className="flex flex-wrap items-start gap-2.5">
            <GenerateEmailButton requestId={request.id} hostName={host?.name ?? "the host"} regenerate={hasTimes} />
            {hasTimes ? <MarkAsSentButton requestId={request.id} /> : null}
            <AskInfoForm requestId={request.id} hostName={host?.name ?? "the host"} />
          </div>
        ) : request.status === "email_sent" ? (
          <div className="flex flex-col items-start gap-2">
            <MarkAsBookedButton requestId={request.id} />
            <p className={`${META} m-0 max-w-[520px]`}>{DESK_DETAIL.markAsBookedHelp}</p>
          </div>
        ) : (
          <p className={META}>{DESK_NEXT_ACTION[request.status]}</p>
        )}
        {draft && canAct ? <p className={META}>{DESK_DETAIL.emailDisclaimer}</p> : null}
        </div>
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

function MarkAsBookedButton({ requestId }: { requestId: string }) {
  return (
    <form action={markAsBooked}>
      <input type="hidden" name="requestId" value={requestId} />
      <button
        type="submit"
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-field border border-field-line bg-card px-[18px] font-semibold text-ink hover:bg-ground"
      >
        {DESK_DETAIL.markAsBooked}
      </button>
    </form>
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
