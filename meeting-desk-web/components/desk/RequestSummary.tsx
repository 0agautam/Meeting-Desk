import type { MeetingRequest, Staff } from "@/lib/types";
import { DESK_DETAIL } from "./deskContent";

/** Everything the host put on the request, so the coordinator reads it before generating the email. Server component. */
export default function RequestSummary({
  request,
  host,
  title = DESK_DETAIL.summaryTitle,
}: {
  request: MeetingRequest;
  host?: Staff;
  /** Heading: "What the host sent" for the coordinator, "What you sent" for the host. */
  title?: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5 rounded-card border border-line bg-card px-3.5 py-3 text-[13px]">
      <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.04em] text-muted">{title}</h2>
      <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-0.5">
        <dt className="text-muted">{DESK_DETAIL.clientLabel}</dt>
        <dd className="m-0 text-ink">
          {request.to.length === 0 ? (
            <span className="text-attention">{DESK_DETAIL.noClient}</span>
          ) : (
            <>
              <span className="text-muted">To</span> {request.to.join(", ")}
              {request.cc.length ? (
                <>
                  {" "}
                  <span className="text-muted">· Cc</span> {request.cc.join(", ")}
                </>
              ) : null}
            </>
          )}
        </dd>

        {request.crmAccount ? (
          <>
            <dt className="text-muted">{DESK_DETAIL.crmLabel}</dt>
            <dd className="m-0 text-ink">{request.crmAccount}</dd>
          </>
        ) : null}

        <dt className="text-muted">{DESK_DETAIL.durationLabel}</dt>
        <dd className="m-0 text-ink">{request.durationMin} min</dd>

        <dt className="text-muted">{DESK_DETAIL.attendeesLabel}</dt>
        <dd className="m-0 text-ink">
          {host?.name ?? "—"} <span className="text-muted">(host)</span>
          {request.attendees.map((a) => (
            <span key={a.email}>
              {", "}
              {a.name}
              {a.required === false ? <span className="text-muted"> (optional)</span> : null}
            </span>
          ))}
        </dd>

        <dt className="text-muted">{DESK_DETAIL.notesLabel}</dt>
        <dd className="m-0 whitespace-pre-line text-ink">
          {request.notes ? request.notes : <span className="text-muted">{DESK_DETAIL.noNotes}</span>}
        </dd>
      </dl>
    </section>
  );
}
