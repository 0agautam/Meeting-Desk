/** Copy for the host's request pages (wireframes 1 and 2). */
export const REQUESTS_PAGE = {
  metaTitle: "My requests",
  sidebarTitle: "My requests",
  filterLabel: "Filter by status",
  emptyFilter: "No requests with this status.",
  newRequestCta: { label: "+ New request", href: "/requests" },
  /** Status chips on the host's list. "all" is the default, so every request is visible until a status is picked. */
  filters: [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "needs_info", label: "Needs info" },
    { key: "updated", label: "Updated" },
    { key: "email_sent", label: "Email sent" },
    { key: "booked", label: "Booked" },
  ],
} as const;

export const NEW_REQUEST_FORM = {
  title: "New meeting request",
  lede: "The coordinator picks this up, may ask you questions here, then emails the client your booking link.",
  wireframe: "1-host-my-requests.html",
  hostLabel: "Host",
  subjectLabel: "What is the meeting about?",
  subjectPlaceholder: "e.g. Q4 planning session",
  clientLabel: "Client: search the CRM, or type an email address",
  clientPlaceholder: "Name, email or domain, e.g. northwind.co",
  clientHelp: "Searches your Zoho CRM contacts and leads. Anyone not in the CRM can be added by typing their full email address.",
  notInCrm: "Not found in the CRM. Use this email address.",
  leadsUnavailable: "Leads weren't searched, only contacts. Ask an admin to reconnect the CRM in Settings to include them.",
  searching: "Searching Zoho CRM…",
  minChars: "Type at least 2 characters to search.",
  noResults: "No contacts found in Zoho CRM.",
  unavailable: "Zoho CRM search isn't available right now. Try again in a moment.",
  noEmail: "No email in Zoho CRM — add one there first.",
  hasMore: "More contacts match — keep typing to narrow it down.",
  resultsLabel: "Zoho CRM contacts",
  addTo: "To",
  addCc: "Cc",
  addedHint: "Pick To or Cc for each contact. You can add several of each.",
  attendeesLabel: "Who from ABR is joining?",
  addPerson: "Search ABR people to add…",
  noMatch: "No one matches that.",
  allAdded: "Everyone is already added.",
  attendeesHint:
    "Everyone listed is invited and gets a tentative hold on their calendar. Only the host and Required people are checked for free time; Optional people never block a slot.",
  host: "Host",
  required: "Required",
  optional: "Optional",
  requiredHelp: "Their calendar must be free",
  optionalHelp: "Invited, but their calendar isn't checked",
  roleLabel: (name: string) => `${name} is`,
  removeLabel: (name: string) => `Remove ${name}`,
  /** Why the CRM can't be used right now, by cause. */
  crmIssue: {
    not_connected: "The Zoho CRM isn't connected for the team yet. Ask an admin to connect it in Settings.",
    reconnect: "The team's Zoho CRM connection needs an admin to reconnect it in Settings.",
    unavailable: "The Zoho CRM isn't available right now. Try again in a moment.",
  },
  durationLabel: "Duration",
  notesLabel: "Notes (optional)",
  notesPlaceholder:
    "Agenda, preferred dates or times, time zone, location or meeting link, who is optional, background the coordinator should know",
  submit: "Submit to the coordinator",
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

export const DRAFT_CARD = {
  label: "New request (draft)",
  subtitle: (subject: string) => `${subject || "Untitled request"} · not submitted yet`,
} as const;

export const REQUEST_DETAIL = {
  metaTitle: "Request",
  wireframe: "2-host-request-history.html",
  notFound: "This request doesn't exist or was removed.",
  questionTitle: "The coordinator needs more information",
  replyTitle: "Your reply",
  editTitle: "Edit this request",
  editHelp: "You can change this request until the coordinator marks the email as sent.",
  noteLabel: "Note for the coordinator (optional)",
  subjectLabel: "Subject",
  notesLabel: "Notes",
  replyLabel: "Reply to the coordinator",
  replyRequired: "Reply to the coordinator's question before resubmitting.",
  updateLabel: "Update the request (changes are highlighted for the coordinator)",
  toLabel: "To",
  ccLabel: "Cc",
  durationLabel: "Duration",
  resubmit: "Resubmit to the coordinator",
  resubmitEdit: "Save changes and resubmit",
  resubmitHelp: (nextVersion: number) => `Saves as version ${nextVersion} and moves the request back to the coordinator.`,
  historyTitle: "History",
  historyFooter: "Every question, reply and change stays on this request, so you and the coordinator always see the same story.",
} as const;

/** Status → what happens next, shown under History when there's no reply form (wireframe 2). */
export const NEXT_ACTION: Record<string, string> = {
  new: "With the coordinator. You can still edit it until the email is sent.",
  needs_info: "Waiting for your reply",
  updated: "With the coordinator. You can still edit it until the email is sent.",
  email_sent: "The email was sent, so this request is locked. Waiting on the client.",
};

/** RequestEvent.type → history line copy. {actor} and {message} are filled in by the component. */
export const EVENT_COPY: Record<string, string> = {
  submitted: "{actor} submitted the request",
  info_requested: "{actor} asked for more information",
  host_replied: '{actor} replied: "{message}"',
  host_edited: "{actor} edited the request",
  email_edited: "The coordinator edited the email",
  email_copied: "The coordinator copied the email",
  marked_sent: "The coordinator marked the email as sent",
  booked: "{message} booked a time",
  marked_booked: "The coordinator marked the meeting as booked",
  booking_failed: "A booking attempt failed",
} as const;

/** Reads `?status=` from the URL: a known status, otherwise "all" (everything visible by default). */
export function parseStatusFilter(value: string | string[] | undefined): string {
  const key = Array.isArray(value) ? value[0] : value;
  return REQUESTS_PAGE.filters.some((f) => f.key === key) ? (key as string) : "all";
}
