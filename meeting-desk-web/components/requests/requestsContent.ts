/** Copy for the host's request pages (wireframes 1 and 2). */
export const REQUESTS_PAGE = {
  metaTitle: "My requests",
  sidebarTitle: "My requests",
  newRequestCta: { label: "+ New request", href: "/requests" },
  filters: [
    { key: "open", label: "Open" },
    { key: "booked", label: "Booked" },
    { key: "all", label: "All" },
  ],
} as const;

export const NEW_REQUEST_FORM = {
  title: "New meeting request",
  lede: "Celian picks this up, may ask you questions here, then emails the client your booking link.",
  wireframe: "1-host-my-requests.html",
  hostLabel: "Host",
  subjectLabel: "What is the meeting about?",
  subjectPlaceholder: "e.g. Q4 planning session",
  clientLabel: "Client (search Zoho CRM by name, email or domain)",
  clientPlaceholder: "e.g. northwind.co",
  addFromCrm: "+ Add from CRM",
  noMatch: "No match yet — Zoho CRM search arrives in a later phase.",
  attendeesLabel: "Who from ABR is joining?",
  addPerson: "+ Add person",
  durationLabel: "Duration",
  notesLabel: "Notes (optional)",
  notesPlaceholder:
    "Agenda, preferred dates or times, time zone, location or meeting link, who is optional, background Celian should know",
  submit: "Submit to Celian",
  submitAndAnother: "Submit & start another",
  saveDraft: "Save draft",
  subjectRequired: "Give the meeting a subject before submitting.",
} as const;

/** 30m/45m/1h/90m/2h chips (wireframe 1). Default selected: 1 hour. */
export const DURATION_OPTIONS = [
  { label: "30m", minutes: 30 },
  { label: "45m", minutes: 45 },
  { label: "1h", minutes: 60 },
  { label: "90m", minutes: 90 },
  { label: "2h", minutes: 120 },
] as const;

export const DEFAULT_DURATION_MIN = 60;

/**
 * Phase 1 stand-in for Zoho CRM search (COQL client lookup is a later phase — see
 * CLAUDE.md "Later phases" and docs/RESEARCH.md §10). Matched by domain or company name.
 */
export const MOCK_CRM_DIRECTORY = [
  {
    domain: "northwind.co",
    company: "Northwind Co.",
    contacts: [
      { name: "Daniel Price", email: "daniel@northwind.example" },
      { name: "Maya Chen", email: "maya@northwind.example" },
      { name: "Alex Kim", email: "alex@northwind.example" },
    ],
  },
  {
    domain: "brightpath.co",
    company: "Brightpath",
    contacts: [
      { name: "Priya Nair", email: "priya@brightpath.example" },
      { name: "Kevin Odera", email: "kevin@brightpath.example" },
    ],
  },
] as const;

export const DRAFT_CARD = {
  label: "New request (draft)",
  subtitle: (subject: string) => `${subject || "Untitled request"} · not submitted yet`,
} as const;

export const REQUEST_DETAIL = {
  metaTitle: "Request",
  wireframe: "2-host-request-history.html",
  notFound: "This request doesn't exist or was removed.",
  questionTitle: "Celian needs more information",
  replyTitle: "Your reply",
  replyLabel: "Reply to Celian",
  replyRequired: "Reply to Celian's question before resubmitting.",
  updateLabel: "Update the request (changes are highlighted for Celian)",
  toLabel: "To",
  ccLabel: "Cc",
  durationLabel: "Duration",
  resubmit: "Resubmit to Celian",
  resubmitHelp: (nextVersion: number) => `Saves as version ${nextVersion} and moves the request back to Celian.`,
  historyTitle: "History",
  historyFooter: "Every question, reply and change stays on this request, so you and Celian always see the same story.",
} as const;

/** Status → what happens next, shown under History when there's no reply form (wireframe 2). */
export const NEXT_ACTION: Record<string, string> = {
  new: "With Celian",
  needs_info: "Waiting for your reply",
  updated: "With Celian",
  email_sent: "Waiting on the client",
};

/** RequestEvent.type → history line copy. {actor} and {message} are filled in by the component. */
export const EVENT_COPY: Record<string, string> = {
  submitted: "{actor} submitted the request",
  info_requested: "{actor} asked for more information",
  host_replied: '{actor} replied: "{message}"',
  email_copied: "Celian copied the email",
  marked_sent: "Celian marked the email as sent",
  booked: "{actor} booked a time",
  booking_failed: "A booking attempt failed",
} as const;
