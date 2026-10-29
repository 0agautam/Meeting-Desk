import type { RequestEvent, Staff } from "@/lib/types";
import { formatEventTime } from "@/lib/ui/formatDateTime";

const DOT_COLOR: Record<string, string> = {
  submitted: "bg-muted",
  info_requested: "bg-attention",
  host_replied: "bg-accent",
  host_edited: "bg-accent",
  email_edited: "bg-accent",
  email_copied: "bg-accent",
  marked_sent: "bg-accent",
  booked: "bg-accent",
  booking_failed: "bg-attention",
};

function eventLine(event: RequestEvent, staffById: Map<string, Staff>, eventCopy: Record<string, string>): string {
  const template = eventCopy[event.type] ?? event.type;
  const actor = staffById.get(event.actorId)?.name ?? "Someone";
  return template.replace("{actor}", actor).replace("{message}", event.message ?? "");
}

/**
 * Shared timeline used by both the host (wireframe 2) and desk (wireframe 3) detail
 * pages. `eventCopy` and `nextAction` are supplied by the caller so each page can
 * phrase the same event from its own point of view (e.g. "You asked" vs "The coordinator asked").
 */
export default function RequestHistory({
  events,
  staffById,
  eventCopy,
  nextAction,
  title,
  footer,
}: {
  events: RequestEvent[];
  staffById: Map<string, Staff>;
  eventCopy: Record<string, string>;
  nextAction?: string;
  title: string;
  footer: string;
}) {
  return (
    <aside className="flex w-[320px] shrink-0 flex-col gap-3.5 rounded-panel border border-line bg-card p-5 text-[13px] max-lg:w-full lg:min-h-0 lg:overflow-y-auto">
      <div className="text-xs font-semibold text-ink">{title}</div>
      {events.map((event) => (
        <div key={event.id} className="flex gap-2.5">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[event.type] ?? "bg-muted"}`} />
          <div>
            <div className="text-ink">{eventLine(event, staffById, eventCopy)}</div>
            <div className="text-xs text-muted">
              {formatEventTime(event.at)} · version {event.version}
            </div>
          </div>
        </div>
      ))}
      {nextAction ? (
        <div className="flex gap-2.5">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent" />
          <div className="font-semibold text-accent-strong">{nextAction}</div>
        </div>
      ) : null}
      <div className="border-t border-line pt-3 text-xs text-muted">{footer}</div>
    </aside>
  );
}
