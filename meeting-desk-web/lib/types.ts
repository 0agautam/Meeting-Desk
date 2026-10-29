/**
 * Domain model — mirrors CLAUDE.md "Domain model". All times are ISO-8601 UTC strings;
 * convert to the host's time zone (default America/Toronto) only when displaying.
 */

export type StaffRole = "host" | "coordinator" | "admin";
export type CalendarProvider = "google" | "zoho";

export type WorkingHours = {
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  /** "HH:mm" in the organisation's time zone: the hours on every working day that has no entry in `byDay`. */
  start: string;
  end: string;
  /** Different hours on particular weekdays (0 = Sunday), when the organisation's hours aren't the same every day. */
  byDay?: Record<number, { start: string; end: string }>;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  /** One or more of host / coordinator / admin. Admin can do everything. Stored comma-separated in Data Store. */
  roles: StaffRole[];
  calendarProvider: CalendarProvider | null;
  /** Minutes kept free before a meeting starts / after it ends. */
  bufferBeforeMin: number;
  bufferAfterMin: number;
  workingHours: WorkingHours;
  timezone: string;
  /** Public booking link: /book/<slug> */
  slug: string;
};

export type RequestStatus = "new" | "needs_info" | "updated" | "email_sent" | "booked";

/**
 * An ABR person joining the meeting, picked from the CRM's users. Everyone gets the grey hold and the invite;
 * only required people's calendars decide which times are offered. Missing `required` means required.
 */
export type Attendee = {
  name: string;
  email: string;
  crmUserId?: string;
  required?: boolean;
};

export function isRequired(attendee: Pick<Attendee, "required">): boolean {
  return attendee.required !== false;
}

/** A concrete time the coordinator offered the client for one request. */
export type OfferedSlot = {
  startUtc: string;
  endUtc: string;
  /** The grey tentative event holding this time in the host's calendar, until the meeting is booked or the hold is released. */
  holdEventId?: string;
  /** The same grey hold on each invited team member's own calendar (their staff id and event id). */
  attendeeHolds?: { staffId: string; eventId: string }[];
};

/**
 * What the host's notes say about timing, as read by the AI and then corrected by the coordinator.
 * Applied when times are picked; `other` carries anything that isn't about timing so nothing is dropped.
 */
export type SchedulingConstraints = {
  /** First day a meeting may take place (YYYY-MM-DD), or null. */
  earliestDate: string | null;
  /** Last day a meeting may take place (YYYY-MM-DD), or null. */
  latestDate: string | null;
  /** Days of the week to avoid, Sunday = 0 … Saturday = 6. */
  avoidWeekdays: number[];
  timeOfDay: "morning" | "afternoon" | "any";
  /** Meetings must start at or after this time (HH:mm, host's time zone), or null. */
  notBeforeTime: string | null;
  /** Meetings must end at or before this time (HH:mm, host's time zone), or null. */
  notAfterTime: string | null;
  /** How soon the notes say the meeting is needed, judged by the AI from the wording: "normal" starts at the 2nd working day, "soon" at the next working day, "today" may offer later today. */
  urgency: "normal" | "soon" | "today";
  other: string;
};

/** The client email as the coordinator last saved it. Generated from the offered times; she can edit every part. */
export type EmailDraft = { subject: string; body: string; to: string[]; cc: string[] };

export type MeetingRequest = {
  id: string;
  hostId: string;
  subject: string;
  to: string[];
  cc: string[];
  attendees: Attendee[];
  durationMin: number;
  notes: string;
  status: RequestStatus;
  version: number;
  crmAccount?: string;
  /** Times generated for the client's email; empty until the coordinator generates the email. */
  offeredSlots: OfferedSlot[];
  /** Saved email for the client; absent until the coordinator generates it. Cleared when the host resubmits. */
  emailDraft?: EmailDraft;
  /** What the notes say about timing; absent until the notes were read (on the first Generate email). Cleared when the host edits the request. */
  constraints?: SchedulingConstraints;
  createdAt: string;
  updatedAt: string;
};

export type RequestEventType =
  | "submitted"
  | "info_requested"
  | "host_replied"
  | "host_edited"
  | "email_edited"
  | "email_copied"
  | "marked_sent"
  | "booked"
  | "booking_failed";

export type FieldChange = { from: unknown; to: unknown };

export type RequestEvent = {
  id: string;
  requestId: string;
  type: RequestEventType;
  actorId: string;
  message?: string;
  changes?: Record<string, FieldChange>;
  version: number;
  at: string;
};

export type BookingStatus = "pending" | "booked" | "failed";

export type Booking = {
  id: string;
  requestId?: string;
  hostId: string;
  startUtc: string;
  endUtc: string;
  clientName: string;
  clientEmail: string;
  company?: string;
  notes?: string;
  status: BookingStatus;
  failureReason?: string;
  /** Unique `hostId|startUtc` — the double-booking guard. */
  slotKey: string;
  /** Set once the real calendar event is created (Zoho: the event uid). */
  providerEventId?: string;
  /** Zoho only — needed to update/delete the event later (docs/RESEARCH.md §10). */
  providerEventEtag?: string;
};
