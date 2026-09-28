import type { MeetingRequest, Staff } from "@/lib/types";

/** Copy for Celian's desk (wireframe 3). */
export const DESK_PAGE = {
  metaTitle: "Desk",
  searchLabel: "Search requests",
  searchPlaceholder: "Search client, host, subject",
  wireframe: "3-celian-desk.html",
  filters: [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "needs_info", label: "Needs info" },
    { key: "updated", label: "Updated" },
    { key: "email_sent", label: "Email sent" },
    { key: "booked", label: "Booked" },
  ],
  emptyState: "Pick a request from the queue.",
} as const;

export const DESK_DETAIL = {
  changedTitle: "Changed since your question",
  emailHeaderLabel: "Email draft to copy",
  subjectLabel: "Subject",
  copyEmail: "Copy email",
  copied: "Copied",
  markAsSent: "Mark as sent",
  askForInfo: (host: string) => `Ask ${host} for info`,
  askPlaceholder: "What do you need to know before this can move forward?",
  askSubmit: "Send question",
  askCancel: "Cancel",
  emailDisclaimer: "Paste the email into your own inbox. The app never sends email itself.",
  historyTitle: "History",
  historyFooter: "Every question, reply and change stays on this request, so you and the host always see the same story.",
  fieldLabels: { to: "To", cc: "Cc", durationMin: "Duration" } as Record<string, string>,
} as const;

/** RequestEvent.type → history line, from Celian's point of view (desk pages only). */
export const DESK_EVENT_COPY: Record<string, string> = {
  submitted: "{actor} submitted the request",
  info_requested: 'You asked: "{message}"',
  host_replied: '{actor} replied: "{message}"',
  email_copied: "You copied the email",
  marked_sent: "You marked the email as sent",
  booked: "{actor} booked a time",
  booking_failed: "A booking attempt failed",
};

/** Status → what Celian should do next (desk pages only). */
export const DESK_NEXT_ACTION: Record<string, string> = {
  new: "New — review and reply",
  needs_info: "Waiting on the host",
  updated: "Your turn: copy and send the email",
  email_sent: "Waiting on the client",
};

/** Applies the toolbar's status filter + search query (wireframe 3). */
export function filterDeskRequests(
  requests: MeetingRequest[],
  staff: Staff[],
  { status, q }: { status?: string; q?: string },
): MeetingRequest[] {
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const query = q?.trim().toLowerCase();

  return requests
    .filter((r) => (status && status !== "all" ? r.status === status : true))
    .filter((r) => {
      if (!query) return true;
      const haystack = [r.subject, ...r.to, ...r.cc, staffById.get(r.hostId)?.name ?? ""].join(" ").toLowerCase();
      return haystack.includes(query);
    });
}

const DURATION_PHRASE: Record<number, string> = {
  30: "30-minute",
  45: "45-minute",
  60: "one-hour",
  90: "90-minute",
  120: "two-hour",
};

/** Client's first name, guessed from their email's local part — Phase 1 has no CRM contact name yet. */
function guessFirstName(email?: string): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Builds the copyable email draft (wireframe 3). Never sent by the app — Celian pastes it herself. */
export function buildEmailDraft(input: {
  clientEmail?: string;
  hostName: string;
  hostSlug: string;
  subject: string;
  durationMin: number;
}): string {
  const duration = DURATION_PHRASE[input.durationMin] ?? `${input.durationMin}-minute`;
  return `Hi ${guessFirstName(input.clientEmail)},

I'm Celian with Amazing Business Results, working alongside ${input.hostName}. I'm setting up a ${duration} ${input.subject.toLowerCase()} with you.

You can pick any time that suits you here and it goes straight into ${input.hostName}'s calendar:
[your-domain]/book/${input.hostSlug}

Best,
Celian`;
}
