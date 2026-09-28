import type { RequestStatus } from "@/lib/types";
import { BADGE } from "@/lib/ui/classes";

const STATUS_STYLE: Record<RequestStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-status-new text-status-new-text" },
  needs_info: { label: "Needs info", className: "bg-status-needs-info text-status-needs-info-text" },
  updated: { label: "Updated", className: "bg-status-updated text-status-updated-text" },
  email_sent: { label: "Email sent", className: "bg-status-email-sent text-status-email-sent-text" },
  booked: { label: "Booked", className: "bg-status-booked text-status-booked-text" },
};

export function statusLabel(status: RequestStatus): string {
  return STATUS_STYLE[status].label;
}

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const style = STATUS_STYLE[status];
  return <span className={`${BADGE} ${style.className}`}>{style.label}</span>;
}
