import "server-only";

/**
 * "Connect Zoho" — our own OAuth flow, so each person approves access to their OWN
 * Zoho Calendar (and CRM read) once, on Zoho's screen. Replaces console Connections,
 * which an admin has to create per person. US data centre (accounts.zoho.com).
 *
 * Needs ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET (AppSail environment variables) from a
 * "Server-based Application" registered in api-console.zoho.com whose redirect URI is
 * `<app url>/api/zoho/callback`.
 */

const ACCOUNTS_URL = "https://accounts.zoho.com";
const CALENDAR_URL = "https://calendar.zoho.com/api/v1";

/** Short-lived cookie that proves the approval coming back is the one we started (anti-forgery). */
export const ZOHO_STATE_COOKIE = "md_zoho_state";

/** The personal Zoho Calendar approval: calendar events only, and the account's email so we can check who approved. The CRM has its own organisation-wide approval. */
export const ZOHO_SCOPES = ["ZohoCalendar.calendar.READ", "ZohoCalendar.event.ALL", "AaaServer.profile.READ"].join(",");

/**
 * The organisation's CRM approval (an admin connects it once in Settings): CRM read only, every setting included (business hours,
 * time zone, organisation details), plus the account's email. No calendar, and nothing that can change the CRM.
 */
export const ZOHO_CRM_SCOPES = [
  "ZohoCRM.coql.READ",
  "ZohoCRM.modules.READ",
  "ZohoCRM.settings.READ", // all CRM settings, read only
  "ZohoCRM.settings.business_hours.READ", // the organisation's business hours and time zone
  "ZohoCRM.org.READ", // organisation details (its time zone is the fallback)
  "ZohoCRM.users.READ",
  "AaaServer.profile.READ",
].join(",");

/** Cookie that remembers WHY the person is at Zoho (`crm` = the CRM-only approval), so the one callback address can serve both. */
export const ZOHO_PURPOSE_COOKIE = "md_zoho_purpose";

export function zohoClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Sign-in only: just the account's email, no calendar or CRM access, and no refresh token kept. */
export const ZOHO_SIGNIN_SCOPES = "AaaServer.profile.READ";

export function buildAuthorizeUrl(opts: { clientId: string; redirectUri: string; state: string; scope?: string; signIn?: boolean }): string {
  const qs = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    scope: opts.scope ?? ZOHO_SCOPES,
    redirect_uri: opts.redirectUri,
    state: opts.state,
  });
  if (!opts.signIn) {
    qs.set("access_type", "offline"); // gives a refresh token, so the app can keep working after the person closes the tab
    qs.set("prompt", "consent");
  }
  return `${ACCOUNTS_URL}/oauth/v2/auth?${qs}`;
}

/** Sign-in version of the code exchange: only the short-lived access token is needed (to read the email), nothing is stored. */
export async function exchangeSignInCode(opts: { code: string; redirectUri: string; clientId: string; clientSecret: string }): Promise<string> {
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Zoho sign-in exchange failed: ${data.error ?? res.status}`);
  return data.access_token;
}

export type ZohoTokens = { accessToken: string; refreshToken: string };

/** Trades the one-time code Zoho sent back for tokens. Throws with Zoho's error name if it refuses. */
export async function exchangeCode(opts: { code: string; redirectUri: string; clientId: string; clientSecret: string }): Promise<ZohoTokens> {
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
    }),
  });
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string };
  if (!data.access_token || !data.refresh_token) throw new Error(`Zoho token exchange failed: ${data.error ?? res.status}`);
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export type RefreshedToken = { accessToken: string; expiresInSec: number };

/**
 * Trades a saved refresh token for a fresh access token (valid about an hour). Throws an
 * error whose message is Zoho's error name; `invalid_code` means the permission was
 * withdrawn at Zoho and the person has to connect again.
 */
export async function refreshAccessToken(opts: { refreshToken: string; clientId: string; clientSecret: string }): Promise<RefreshedToken> {
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: opts.refreshToken,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
    }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!data.access_token) throw new Error(data.error ?? `refresh failed (${res.status})`);
  return { accessToken: data.access_token, expiresInSec: data.expires_in ?? 3600 };
}

/** The email of the Zoho account that just approved — compared with the team list. */
export async function fetchApprovedEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${ACCOUNTS_URL}/oauth/user/info`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
  const data = (await res.json()) as { Email?: string };
  if (!data.Email) throw new Error(`Couldn't read the approving Zoho account's email (${res.status}).`);
  return data.Email;
}

/** The calendar to book into: the person's default one. */
export async function fetchDefaultCalendarUid(accessToken: string): Promise<string> {
  const res = await fetch(`${CALENDAR_URL}/calendars`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
  if (!res.ok) throw new Error(`Couldn't list the Zoho calendars (${res.status}).`);
  const { calendars } = (await res.json()) as { calendars: { uid: string; isdefault: boolean }[] };
  const calendar = calendars.find((c) => c.isdefault) ?? calendars[0];
  if (!calendar) throw new Error("This Zoho account has no calendar.");
  return calendar.uid;
}

/** Tells Zoho to cancel a refresh token (on Disconnect, or when the wrong account approved). Best effort. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    await fetch(`${ACCOUNTS_URL}/oauth/v2/token/revoke?${new URLSearchParams({ token: refreshToken })}`, { method: "POST" });
  } catch {
    // The saved copy is deleted regardless; a revoke that fails only leaves an unused token at Zoho.
  }
}
