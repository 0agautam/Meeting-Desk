/** Copy and settings for the Zoho CRM launcher widget (the page the CRM "Meeting Desk" tab shows). */
export const CRM_LAUNCHER = {
  metaTitle: "Meeting Desk in CRM",
  title: "Meeting Desk",
  lede: "Request, book and follow up client meetings.",
  checking: "Checking your CRM account…",
  signedInAs: (name: string) => `Signed in to Zoho CRM as ${name}`,
  outside: "Open this page from the Meeting Desk tab inside Zoho CRM to see your CRM account here.",
  openButton: "Open Meeting Desk",
  openHint: "Opens in a new tab and signs you in with your Zoho account (you must be on the team list).",
  /** Zoho's embedded-app SDK (1.4 is the version Zoho's widget docs point to). */
  sdkUrl: "https://live.zwidgets.com/js-sdk/1.4/ZohoEmbededAppSDK.min.js",
  /** How long to wait for CRM to answer before assuming the page isn't running inside CRM. */
  waitMs: 6000,
} as const;
