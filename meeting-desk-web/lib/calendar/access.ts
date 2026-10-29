import "server-only";
import type { BusyInterval, BusyWindow } from "@/lib/booking/slots";
import { getCrmAccount, saveCrmAccount } from "@/lib/crm/accountStore";
import { getCalendarAccount, saveCalendarAccount, type CalendarAccount } from "./accountStore";
import { createEvent as createGoogleEvent, deleteEvent as deleteGoogleEvent, getBusyIntervals as getGoogleBusy } from "./google";
import { googleClient, refreshGoogleAccessToken } from "./googleOauth";
import { createEvent as createZohoEvent, deleteEvent as deleteZohoEvent, getBusyIntervals as getZohoBusy, getEventEtag, type NewEvent } from "./zoho";
import { refreshAccessToken, zohoClient } from "./zohoOauth";

/**
 * The one door the rest of the app uses for calendars (and for Zoho CRM calls). Looks up the person's
 * own saved approval, gets a working access token for it and calls their provider. Zoho and Google are
 * the calendar providers; a person has one at a time (CalendarAccounts). CRM access is their Zoho
 * approval: the calendar one when Zoho is their calendar, otherwise a separate CRM approval (CrmAccounts).
 *
 * A person with no connected calendar is not an error: reads return "no busy time" and
 * `createCalendarEvent` returns null, and callers decide what that means.
 */

/** Providers allow only a few access tokens per refresh token, so keep each one until shortly before it expires. */
const EXPIRY_MARGIN_MS = 5 * 60_000;
type CachedToken = { accessToken: string; expiresAt: number };
/** Remembers which refresh token an access token came from: after "Reconnect" there is a new refresh token, and the old access token must not be reused. */
type CacheEntry = { refreshToken: string; token: Promise<CachedToken> };
const globalForTokens = globalThis as typeof globalThis & { __meetingDeskAccessTokens?: Map<string, CacheEntry> };
const tokenCache = () => (globalForTokens.__meetingDeskAccessTokens ??= new Map());

const calendarKey = (staffId: string) => `cal:${staffId}`;
const crmKey = (staffId: string) => `crm:${staffId}`;

/** Throws away the person's cached access tokens, so the next call gets fresh ones (used when a provider rejects one). */
export function forgetAccessToken(staffId: string): void {
  tokenCache().delete(calendarKey(staffId));
  tokenCache().delete(crmKey(staffId));
}

type TokenSource = {
  key: string;
  refreshToken: string;
  refresh: () => Promise<{ accessToken: string; expiresInSec: number }>;
  /** Called when the provider says the permission is gone, so My settings can ask them to connect again. */
  onRevoked: () => Promise<void>;
};

async function cachedToken(source: TokenSource): Promise<string> {
  const cache = tokenCache();
  const cached = cache.get(source.key);
  if (cached) {
    const token = cached.refreshToken === source.refreshToken ? await cached.token.catch(() => null) : null;
    if (token && token.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return token.accessToken;
    cache.delete(source.key);
  }

  // Cache the promise itself so simultaneous requests for the same person share one refresh.
  const pending = source.refresh().then((t) => ({ accessToken: t.accessToken, expiresAt: Date.now() + t.expiresInSec * 1000 }));
  cache.set(source.key, { refreshToken: source.refreshToken, token: pending });
  try {
    return (await pending).accessToken;
  } catch (err) {
    cache.delete(source.key);
    if (err instanceof Error && err.message === "invalid_code") await source.onRevoked();
    throw err;
  }
}

function zohoRefresh(refreshToken: string) {
  const client = zohoClient();
  if (!client) throw new Error("ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET are not set.");
  return refreshAccessToken({ refreshToken, ...client });
}

function googleRefresh(refreshToken: string) {
  const client = googleClient();
  if (!client) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.");
  return refreshGoogleAccessToken({ refreshToken, ...client });
}

/** A working access token for the person's calendar provider. */
function getAccessToken(account: CalendarAccount): Promise<string> {
  return cachedToken({
    key: calendarKey(account.staffId),
    refreshToken: account.refreshToken,
    refresh: () => (account.provider === "google" ? googleRefresh(account.refreshToken) : zohoRefresh(account.refreshToken)),
    onRevoked: () => saveCalendarAccount({ ...account, status: "error" }),
  });
}

/** The person's usable calendar connection, or null if they have none (or it needs reconnecting). */
async function connectedAccount(staffId: string): Promise<CalendarAccount | null> {
  const account = await getCalendarAccount(staffId);
  return account && account.status === "connected" && account.refreshToken ? account : null;
}

/**
 * Authorization header for calling Zoho CRM as this person: their separate CRM approval if they have one,
 * otherwise their Zoho Calendar approval. Null if they have neither. Throws "invalid_code" if they withdrew the approval at Zoho.
 */
export async function getZohoApiHeaders(staffId: string): Promise<Record<string, string> | null> {
  // A problem reading the CRM-approval table must not break CRM access for people who use their Zoho Calendar approval.
  const crm = await getCrmAccount(staffId).catch((err) => {
    console.warn("getZohoApiHeaders: couldn't read CrmAccounts:", err);
    return null;
  });
  if (crm && crm.status === "connected" && crm.refreshToken) {
    const token = await cachedToken({
      key: crmKey(staffId),
      refreshToken: crm.refreshToken,
      refresh: () => zohoRefresh(crm.refreshToken),
      onRevoked: () => saveCrmAccount({ ...crm, status: "error" }),
    });
    return { Authorization: `Zoho-oauthtoken ${token}` };
  }
  const account = await connectedAccount(staffId);
  if (!account || account.provider !== "zoho") return null;
  return { Authorization: `Zoho-oauthtoken ${await getAccessToken(account)}` };
}

export async function hasCalendar(staffId: string): Promise<boolean> {
  return (await connectedAccount(staffId)) !== null;
}

/** The person's busy times in the window (their time zone and working hours turn a day off into blocked working hours); [] if they have no calendar connected. Throws if the provider can't be read. */
export async function getBusyForStaff(staffId: string, opts: BusyWindow): Promise<BusyInterval[]> {
  const account = await connectedAccount(staffId);
  if (!account) return [];
  switch (account.provider) {
    case "zoho":
      return getZohoBusy(await getAccessToken(account), opts);
    case "google":
      return getGoogleBusy(await getAccessToken(account), opts);
    default:
      return [];
  }
}

/** Removes an event from the person's calendar. Does nothing if they have no calendar connected; throws if the provider refuses. */
export async function deleteCalendarEvent(staffId: string, opts: { eventId: string }): Promise<void> {
  const account = await connectedAccount(staffId);
  if (!account) return;
  switch (account.provider) {
    case "zoho": {
      // Zoho needs the event's current etag to delete it.
      const token = await getAccessToken(account);
      const etag = await getEventEtag(token, { calendarUid: account.calendarUid, eventId: opts.eventId });
      await deleteZohoEvent(token, { calendarUid: account.calendarUid, eventId: opts.eventId, etag });
      return;
    }
    case "google":
      await deleteGoogleEvent(await getAccessToken(account), { calendarUid: account.calendarUid, eventId: opts.eventId });
      return;
    default:
      return;
  }
}

/** Puts an event in the person's calendar. Returns null if they have no calendar connected; throws if the provider refuses. */
export async function createCalendarEvent(
  staffId: string,
  opts: Omit<NewEvent, "calendarUid">,
): Promise<{ eventId: string; etag: string } | null> {
  const account = await connectedAccount(staffId);
  if (!account) return null;
  switch (account.provider) {
    case "zoho":
      return createZohoEvent(await getAccessToken(account), { calendarUid: account.calendarUid, ...opts });
    case "google":
      return createGoogleEvent(await getAccessToken(account), { calendarUid: account.calendarUid, ...opts });
    default:
      return null;
  }
}
