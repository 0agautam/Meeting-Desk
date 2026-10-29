import "server-only";

/**
 * "Connect Google Calendar" — our own OAuth flow, so each person approves access to their OWN Google
 * Calendar once, on Google's screen (same idea as lib/calendar/zohoOauth.ts).
 *
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (AppSail environment variables) from a "Web
 * application" OAuth client in Google Cloud whose authorized redirect URI is `<app url>/api/google/callback`.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/** Short-lived cookie that proves the approval coming back is the one we started (anti-forgery). */
export const GOOGLE_STATE_COOKIE = "md_google_state";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/** Events on the person's calendar (read, create, delete) and their email so we can check who approved. */
export const GOOGLE_SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email", GOOGLE_CALENDAR_SCOPE].join(" ");

export function googleClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function buildGoogleAuthorizeUrl(opts: { clientId: string; redirectUri: string; state: string; loginHint?: string }): string {
  const qs = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    scope: GOOGLE_SCOPES,
    access_type: "offline", // gives a refresh token, so the app keeps working after the tab is closed
    prompt: "consent", // always ask, so Google always returns a refresh token
    state: opts.state,
    ...(opts.loginHint ? { login_hint: opts.loginHint } : {}),
  });
  return `${AUTH_URL}?${qs}`;
}

export type GoogleTokens = { accessToken: string; refreshToken: string; scope: string };

/** Trades the one-time code Google sent back for tokens. Throws with Google's error name if it refuses. */
export async function exchangeGoogleCode(opts: { code: string; redirectUri: string; clientId: string; clientSecret: string }): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
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
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; scope?: string; error?: string };
  if (!data.access_token || !data.refresh_token) throw new Error(`Google token exchange failed: ${data.error ?? res.status}`);
  return { accessToken: data.access_token, refreshToken: data.refresh_token, scope: data.scope ?? "" };
}

/** The verified email of the Google account that just approved — compared with the team list. */
export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = (await res.json()) as { email?: string; email_verified?: boolean };
  if (!data.email || data.email_verified === false) throw new Error(`Couldn't read the approving Google account's email (${res.status}).`);
  return data.email;
}

export type RefreshedGoogleToken = { accessToken: string; expiresInSec: number };

/** Trades a saved refresh token for a fresh access token (about an hour). Throws "invalid_code" if the permission was withdrawn at Google. */
export async function refreshGoogleAccessToken(opts: { refreshToken: string; clientId: string; clientSecret: string }): Promise<RefreshedGoogleToken> {
  const res = await fetch(TOKEN_URL, {
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
  if (!data.access_token) throw new Error(data.error === "invalid_grant" ? "invalid_code" : (data.error ?? `refresh failed (${res.status})`));
  return { accessToken: data.access_token, expiresInSec: data.expires_in ?? 3600 };
}

/** Tells Google to cancel a token (on Disconnect, or when the wrong account approved). Best effort. */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    // The saved copy is deleted regardless; a revoke that fails only leaves an unused token at Google.
  }
}
