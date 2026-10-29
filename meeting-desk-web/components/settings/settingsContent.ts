/** Copy for the admin settings page (wireframe 4). */
export const SETTINGS_PAGE = {
  metaTitle: "Settings",
  title: "Team",
  lede: "Everyone here can sign in with their email. Hosts book clients into their own calendar through their link.",
  wireframe: "4-settings.html",
  columns: ["Name", "Roles", "Calendar", "Buffer", "Booking link", ""],
  addPerson: "+ Add person",
  copyLink: "Copy link",
  copied: "Copied",
  edit: "Edit",
  editTitle: (name: string) => `Edit ${name}`,
  calendarLabel: "Calendar",
  bufferBeforeLabel: "Buffer before meetings",
  bufferAfterLabel: "Buffer after meetings",
  /** The team table cell: one number when both sides match. */
  bufferCell: (before: number, after: number) => (before === after ? `${before} min` : `${before} before · ${after} after`),
  save: "Save",
  cancel: "Cancel",
  addTitle: "Add a team member",
  rolesLabel: "Roles",
  noCalendar: "No calendar",
  errors: {
    "last-admin": "There must always be at least one admin.",
    invalid: "Enter a name, a valid email and at least one role.",
    duplicate: "That email is already on the team.",
    self: "You can't delete your own account.",
    "has-requests": "This person still has meeting requests. Remove their host role instead, so the requests keep their history.",
    confirm: "Tick the box to confirm before deleting.",
  } as Record<string, string>,
  close: "Close",
  deleteTitle: "Delete this person",
  deleteHelp: (name: string) =>
    `${name} will be removed from the team, signed out everywhere, and their calendar and CRM approvals cancelled. This can't be undone.`,
  deleteButton: "Delete person",
  deleteSelf: "You can't delete your own account.",
  deleteDataTitle: "Delete this person and all their data",
  deleteDataWarning: (name: string, requests: number, bookings: number) =>
    `${name} has ${requests} meeting ${requests === 1 ? "request" : "requests"} and ${bookings} booking ${bookings === 1 ? "record" : "records"}. Deleting them permanently removes the person, those requests with their full history, and the booking records. This can't be undone.`,
  deleteDataKept: "Meetings already booked stay in the calendars. Their grey tentative holds are taken off the calendars.",
  deleteDataKeepInstead: "To keep the history, remove their Host role instead and save.",
  deleteDataConfirm: "I understand this permanently deletes the person and all their data.",
  deleteDataButton: "Delete person and all their data",
  nameLabel: "Name",
  emailLabel: "Email",
} as const;

export const CALENDAR_LABEL = { google: "Google", zoho: "Zoho" } as const;
export const CALENDAR_PILL_CLASS = {
  google: "bg-status-email-sent text-status-email-sent-text",
  zoho: "bg-status-needs-info text-status-needs-info-text",
} as const;

export const BUFFER_OPTIONS = [
  { minutes: 0, label: "No buffer" },
  { minutes: 10, label: "10 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
] as const;

export const CALENDAR_OPTIONS = [
  { value: "", label: "None" },
  { value: "google", label: "Google Calendar" },
  { value: "zoho", label: "Zoho Calendar" },
] as const;

export const ROLE_HELP = {
  host: "Submits meeting requests, sees only their own, sets their buffer and calendar.",
  coordinator: "Works the meeting requests: sees every request and writes the client email.",
  admin: "Can do everything, including this team list.",
} as const;
