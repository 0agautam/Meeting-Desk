/**
 * Domain model — mirrors CLAUDE.md "Domain model". All times are ISO-8601 UTC strings;
 * convert to the host's time zone (default America/Toronto) only when displaying.
 */

export type StaffRole = "host" | "coordinator" | "admin";
export type CalendarProvider = "google" | "zoho";

export type WorkingHours = {
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  /** "HH:mm" in the staff member's time zone */
  start: string;
  end: string;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  calendarProvider: CalendarProvider | null;
  bufferMin: number;
  workingHours: WorkingHours;
  timezone: string;
  /** Public booking link: /book/<slug> */
  slug: string;
};

export type RequestStatus = "new" | "needs_info" | "updated" | "email_sent" | "booked";

export type Attendee = {
  staffId: string;
  required: boolean;
};

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
  createdAt: string;
  updatedAt: string;
};

export type RequestEventType =
  | "submitted"
  | "info_requested"
  | "host_replied"
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
};
