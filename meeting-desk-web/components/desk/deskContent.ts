import type { MeetingRequest, OfferedSlot, Staff } from "@/lib/types";

/** Copy for the coordinator's desk (wireframe 3). */
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
  toLabel: "To",
  ccLabel: "Cc",
  emailTextLabel: "Email text",
  saveEmail: "Save changes",
  saving: "Saving…",
  saved: "Saved.",
  sentNote: "This email was already marked as sent. You can still edit it and copy the updated text.",
  copyEmail: "Copy email",
  copied: "Copied",
  markAsSent: "Mark as sent",
  askForInfo: (host: string) => `Ask ${host} for info`,
  askPlaceholder: "What do you need to know before this can move forward?",
  askSubmit: "Send question",
  askCancel: "Cancel",
  emailDisclaimer: "Paste the email into your own inbox. The app never sends email itself. Regenerate rewrites it from the calendar, replacing your edits.",
  historyTitle: "History",
  historyFooter: "Every question, reply and change stays on this request, so you and the host always see the same story.",
  fieldLabels: { subject: "Subject", notes: "Notes", to: "To", cc: "Cc", attendees: "ABR attendees", durationMin: "Duration" } as Record<string, string>,
  summaryTitle: "What the host sent",
  summaryTitleForHost: "What you sent",
  clientLabel: "Client",
  crmLabel: "CRM account",
  durationLabel: "Duration",
  attendeesLabel: "ABR attendees",
  notesLabel: "Host notes",
  noNotes: "No notes from the host.",
  noClient: "No client email yet",
  generate: "Generate email",
  regenerate: "Regenerate",
  generating: "Checking the calendar…",
  generateHint: "Checks the host's real calendar for free times and writes them into the email.",
  releaseHolds: "Release holds",
  constraintsTitle: "What I understood from the notes",
  urgencyLabel: "How soon",
  urgencyOptions: {
    normal: "Normal: from the 2nd working day",
    soon: "Urgent: from the next working day",
    today: "Urgent: today is fine",
  },
  askAboutTimes: (host: string) => `Ask ${host} for other times`,
  askAboutTimesLabel: (host: string) => `Message to ${host} (edit it if you like)`,
  constraintsNone: "Nothing about timing found in the notes.",
  constraintsHelp: "Correct anything that's wrong, then save and regenerate to get times that follow it.",
  earliestLabel: "Not before (date)",
  latestLabel: "Not after (date)",
  avoidLabel: "Avoid these days",
  timeOfDayLabel: "Time of day",
  timeOfDayOptions: { any: "Any time", morning: "Mornings only", afternoon: "Afternoons only" } as Record<string, string>,
  notBeforeLabel: "Start no earlier than",
  notAfterLabel: "Finish by",
  otherLabel: "Other things in the notes (not about timing)",
  saveConstraints: "Save",
  saveAndRegenerate: "Save and regenerate times",
  rereadNotes: "Read the notes again",
  working: "Working…",
  holdsNote: "Each time is held as a grey tentative event on the host's calendar. The holds are removed when the client books, when you regenerate, or when the host edits the request. If you book the meeting another way, release them here or delete them in the calendar.",
  offeredTitle: "Times offered to the client",
  offeredNote: (tz: string) => `Shown in ${tz}. Checked against the host's calendar when generated.`,
} as const;

/** RequestEvent.type → history line, from the coordinator's point of view (desk pages only). */
export const DESK_EVENT_COPY: Record<string, string> = {
  submitted: "{actor} submitted the request",
  info_requested: 'You asked: "{message}"',
  host_replied: '{actor} replied: "{message}"',
  host_edited: "{actor} edited the request",
  email_edited: "You edited the email",
  email_copied: "You copied the email",
  marked_sent: "You marked the email as sent",
  booked: "{message} booked a time",
  booking_failed: "A booking attempt failed",
};

/** Status → what the coordinator should do next (desk pages only). */
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
  { status, q, host }: { status?: string; q?: string; host?: string },
): MeetingRequest[] {
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const query = q?.trim().toLowerCase();

  return requests
    .filter((r) => (status && status !== "all" ? r.status === status : true))
    .filter((r) => (host ? r.hostId === host : true))
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
  const first = local.split(/[+._-]/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** "Wed, Oct 7 · 9:00 AM – 9:45 AM" in the given time zone. */
export function formatSlot(slot: OfferedSlot, timeZone: string): string {
  const start = new Date(slot.startUtc);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  return `${day} · ${time.format(start)} – ${time.format(new Date(slot.endUtc))}`;
}

/** "Colombia Standard Time" — spelled out so the client knows which clock the times are on. */
export function timeZoneLabel(timeZone: string): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")
      ?.value ?? timeZone
  );
}

/** Builds the copyable email draft (wireframe 3). Never sent by the app — the coordinator pastes it herself. */
export function buildEmailDraft(input: {
  clientEmail?: string;
  hostName: string;
  subject: string;
  durationMin: number;
  coordinatorName: string;
  slots: OfferedSlot[];
  timeZone: string;
  bookingUrl: string;
}): string {
  const duration = DURATION_PHRASE[input.durationMin] ?? `${input.durationMin}-minute`;
  const times = input.slots.map((s) => `  • ${formatSlot(s, input.timeZone)}`).join("\n");
  return `Hi ${guessFirstName(input.clientEmail)},

I'm ${input.coordinatorName} with Amazing Business Results, working alongside ${input.hostName}. I'm setting up a ${duration} ${input.subject.toLowerCase()} with you.

${input.hostName} is free at these times (${timeZoneLabel(input.timeZone)}):
${times}

Pick the one that suits you here and it goes straight into ${input.hostName}'s calendar:
${input.bookingUrl}

If none of these work, just reply with a few times that do.

Best,
${input.coordinatorName}`;
}

/** The desk's current filters as a query string ("?status=updated&host=12"), "" when none, so opening a request keeps them. */
export function deskQuery({ status, q, host }: { status?: string; q?: string; host?: string }): string {
  const qs = new URLSearchParams();
  if (status && status !== "all") qs.set("status", status);
  if (host) qs.set("host", host);
  if (q) qs.set("q", q);
  const text = qs.toString();
  return text ? `?${text}` : "";
}

/** The question to the host when what was asked for isn't available. The coordinator can edit it before sending. */
export function buildAvailabilityQuestion(o: {
  durationMin: number;
  names: string[];
  /** What the notes asked for, in words (see describeConstraints); empty if nothing narrowed the times. */
  wanted: string[];
  problem: "none" | "few" | "today" | "soon";
}): string {
  const who = o.names.join(", ");
  const time = `${o.durationMin}-minute`;
  const fit = o.wanted.length ? ` that fits what you asked for (${o.wanted.join(", ")})` : "";
  const close = "Could you suggest other days or times that work, or tell us if someone can be left out?";
  if (o.problem === "none") return `We couldn't find a ${time} time${fit} that is free for everyone (${who}). ${close}`;
  if (o.problem === "few") return `Only one ${time} time${fit} is free for everyone (${who}). ${close}`;
  const when = o.problem === "today" ? "today" : "on the next working day";
  return `Your notes ask for this meeting ${when}, but no ${time} time ${when === "today" ? "is left today" : "is free then"} for everyone (${who}). ${close}`;
}
