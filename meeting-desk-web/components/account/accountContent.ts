/** Copy for "My settings" (/account). */
export const ACCOUNT_PAGE = {
  metaTitle: "My settings",
  title: "My settings",
  lede: (email: string) => `Signed in as ${email}.`,
  calendarTitle: "Calendar",
  calendarLede: "Meeting Desk reads your busy times to offer the client free slots, and puts booked meetings in your calendar.",
  providerLabel: "Calendar provider",
  providerHelp: "One at a time. Switching asks you to approve the new one.",
  providerNone: "Choose…",
  providerZoho: "Zoho Calendar",
  providerGoogle: "Google Calendar",
  saveProvider: "Save provider",
  connected: (email: string) => `Connected as ${email}`,
  notConnected: "Not connected",
  connect: "Connect Zoho Calendar",
  disconnect: "Disconnect",
  reconnect: "Reconnect",
  reconnectHelp: "Reconnect asks for your approval again. Do this when Meeting Desk says it needs new access, for example to use the CRM.",
  connectHelp: (email: string) =>
    `You'll approve on Zoho's own screen — log in there as ${email}. It lets Meeting Desk read your calendar's busy times, create and delete the meetings it books, and read your Zoho CRM (search contacts and leads, list users). You can disconnect any time.`,
  connectGoogle: "Connect Google Calendar",
  connectHelpGoogle: (email: string) =>
    `You'll approve on Google's own screen — sign in there as ${email}. It lets Meeting Desk read the busy times on your main calendar and create and delete the meetings it books. You can disconnect any time.`,
  pickProviderFirst: "Choose a provider above to connect.",
  crmTitle: "Zoho CRM",
  crmLede: "Meeting Desk searches your Zoho CRM for clients (contacts and leads) and for the ABR people who join a meeting, with your own CRM permissions.",
  crmViaCalendar: "Covered by your Zoho Calendar approval. Nothing more to do.",
  crmNotConnected: "Not connected",
  crmConnect: "Connect Zoho CRM",
  crmConnectHelp: (email: string) => `You'll approve on Zoho's own screen — log in there as ${email}. This only lets Meeting Desk read your CRM; it doesn't touch your calendar.`,
  crmConnected: (email: string) => `CRM connected as ${email}`,
  crmReconnect: "Reconnect",
  bufferTitle: "Buffer",
  bufferLabel: "Buffer between meetings",
  bufferHelp: "Free time kept before and after each meeting when offering slots.",
  saveBuffer: "Save buffer",
} as const;

/** What the ?zoho=… result in the address means, shown as a banner. */
export const ZOHO_MESSAGES: Record<string, { tone: "good" | "bad"; text: (as?: string, email?: string) => string }> = {
  connected: { tone: "good", text: () => "Zoho Calendar connected." },
  disconnected: { tone: "good", text: () => "Disconnected." },
  denied: { tone: "bad", text: () => "You didn't approve access, so nothing was connected." },
  mismatch: {
    tone: "bad",
    text: (as, email) =>
      `You approved as ${as ?? "a different account"}, but you're signed in here as ${email}. Nothing was connected. Log in to Zoho as ${email} (a private window helps) and try again.`,
  },
  state: { tone: "bad", text: () => "That approval didn't start from this page or took too long. Please click Connect again." },
  error: { tone: "bad", text: () => "Something went wrong while connecting. Please try again." },
  "not-configured": { tone: "bad", text: () => "Zoho isn't set up for this app yet (its Zoho client details are missing). Ask an admin." },
  datacentre: { tone: "bad", text: () => "That Zoho account is in a different region than this app supports." },
};

type BannerMessage = { tone: "good" | "bad"; text: (as?: string, email?: string) => string };

/** What the ?google=… result in the address means, shown as a banner. */
export const GOOGLE_MESSAGES: Record<string, BannerMessage> = {
  connected: { tone: "good", text: () => "Google Calendar connected." },
  denied: { tone: "bad", text: () => "You didn't approve access, so nothing was connected." },
  scope: { tone: "bad", text: () => "Calendar access wasn't ticked on Google's screen, so nothing was connected. Try again and leave calendar access ticked." },
  mismatch: {
    tone: "bad",
    text: (as, email) =>
      `You approved as ${as ?? "a different account"}, but you're signed in here as ${email}. Nothing was connected. Sign in to Google as ${email} (a private window helps) and try again.`,
  },
  state: { tone: "bad", text: () => "That approval didn't start from this page or took too long. Please click Connect again." },
  error: { tone: "bad", text: () => "Something went wrong while connecting. Please try again." },
  "not-configured": { tone: "bad", text: () => "Google isn't set up for this app yet (its Google client details are missing). Ask an admin." },
};

/** What the ?crm=… result in the address means (the separate Zoho CRM approval). */
export const CRM_MESSAGES: Record<string, BannerMessage> = {
  connected: { tone: "good", text: () => "Zoho CRM connected." },
  disconnected: { tone: "good", text: () => "Zoho CRM disconnected." },
  denied: { tone: "bad", text: () => "You didn't approve access, so nothing was connected." },
  mismatch: {
    tone: "bad",
    text: (as, email) =>
      `You approved as ${as ?? "a different account"}, but you're signed in here as ${email}. Nothing was connected. Log in to Zoho as ${email} (a private window helps) and try again.`,
  },
  state: { tone: "bad", text: () => "That approval didn't start from this page or took too long. Please click Connect again." },
  error: { tone: "bad", text: () => "Something went wrong while connecting. Please try again." },
  "not-configured": { tone: "bad", text: () => "Zoho isn't set up for this app yet (its Zoho client details are missing). Ask an admin." },
  datacentre: { tone: "bad", text: () => "That Zoho account is in a different region than this app supports." },
};
