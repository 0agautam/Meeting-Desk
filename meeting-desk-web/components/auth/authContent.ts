/** Copy for the sign-in screen. */
export const LOGIN_PAGE = {
  metaTitle: "Sign in",
  title: "Sign in to Meeting Desk",
  lede: "Enter your work email. You need to be on the team list — an admin adds you.",
  emailLabel: "Work email",
  emailPlaceholder: "you@amazingbusinessresults.ca",
  submit: "Continue",
  submitting: "Signing in…",
  invalidEmail: "Enter a valid email address.",
  notOnList: "That email isn't on the team list. Ask an admin to add you.",
  signOut: "Sign out",
  zohoButton: "Continue with Zoho",
  or: "or use your email",
  /** Shown when "Continue with Zoho" didn't finish (keyed by the `error` value in the address). */
  zohoErrors: {
    "not-on-list": "That Zoho account's email isn't on the team list. Ask an admin to add you.",
    denied: "Zoho sign-in was cancelled.",
    state: "That sign-in took too long or didn't start here. Try again.",
    datacentre: "That Zoho account is in another data centre, which this app doesn't support yet.",
    "not-configured": "Zoho sign-in isn't set up on this deployment.",
    error: "Zoho sign-in didn't work. Try again.",
  },
} as const;
