/** Copy for the admin settings page (wireframe 4). */
export const SETTINGS_PAGE = {
  metaTitle: "Settings",
  title: "Team",
  lede: "Each person uses one calendar. Clients book into it through that person's link.",
  wireframe: "4-settings.html",
  columns: ["Name", "Role", "Calendar", "Buffer", "Booking link", ""],
  addPerson: "+ Add person",
  copyLink: "Copy link",
  copied: "Copied",
  edit: "Edit",
  editTitle: (name: string) => `Edit ${name}`,
  calendarLabel: "Calendar",
  bufferLabel: "Buffer between meetings",
  save: "Save",
  cancel: "Cancel",
  addTitle: "Add a host",
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
  { value: "google", label: "Google Calendar" },
  { value: "zoho", label: "Zoho Calendar" },
] as const;
