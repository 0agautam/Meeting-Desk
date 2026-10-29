import "server-only";
import { allDayBusy, type BusyInterval, type BusyWindow } from "@/lib/booking/slots";

/**
 * Zoho Calendar API calls, made with a person's own access token (from the "Connect Zoho"
 * approval — see lib/calendar/access.ts, which turns the saved refresh token into one).
 * Everything here acts as that Zoho user, so it only ever touches their calendar.
 */

const ZOHO_CALENDAR_BASE = "https://calendar.zoho.com/api/v1";
const MAX_EVENT_RANGE_DAYS = 31;

type ZohoCalendarInfo = {
  uid: string;
  timezone: string;
  isdefault: boolean;
  category?: string;
};

const authHeaders = (accessToken: string): Record<string, string> => ({ Authorization: `Zoho-oauthtoken ${accessToken}` });

/** `2026-09-29T14:00:00.000Z` -> `20260929T140000Z` (the format Zoho Calendar's API wants). */
function toZohoUtc(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

/** Zoho event times look like `20261005T090000-0500` or `20261005T140000Z`; returns epoch ms, or null if unreadable. */
export function parseZohoDateTime(value: unknown): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})?$/.exec(String(value ?? ""));
  if (!m) return null;
  const [, y, mo, d, h, mi, s, offset] = m;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  if (!offset || offset === "Z") return utc;
  const sign = offset[0] === "-" ? -1 : 1;
  return utc - sign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3, 5))) * 60_000;
}

async function fetchCalendars(accessToken: string): Promise<ZohoCalendarInfo[]> {
  const res = await fetch(`${ZOHO_CALENDAR_BASE}/calendars`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(`listCalendars failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { calendars: ZohoCalendarInfo[] }).calendars;
}

type ZohoEvent = { uid?: string; title?: string; isallday?: boolean; dateandtime?: { start?: string; end?: string } };

/**
 * Busy time from the events on every calendar the person owns, expanded to individual
 * occurrences of repeating events. Used instead of Zoho's free/busy API, which answers
 * `{"fb_not_enabled":true}` until each user switches it on (found Oct 2, 2026). Only
 * start/end times are read. An all-day event (a day off) blocks the person's working hours that day.
 * shortcut: an all-day event's end date is read as the day after its last day (as in Google and
 * iCalendar); this has not been checked against a real Zoho all-day event. If Zoho gives the last
 * day itself, a multi-day event frees its last day by mistake: check with a real one.
 */
export async function getBusyIntervals(accessToken: string, opts: BusyWindow): Promise<BusyInterval[]> {
  const calendars = (await fetchCalendars(accessToken)).filter((c) => !c.category || c.category === "own");

  const busy: BusyInterval[] = [];
  const windowEnd = new Date(opts.endUtc).getTime();
  for (let from = new Date(opts.startUtc).getTime(); from < windowEnd; from += MAX_EVENT_RANGE_DAYS * 86_400_000) {
    const to = Math.min(from + MAX_EVENT_RANGE_DAYS * 86_400_000, windowEnd);
    const range = JSON.stringify({ start: toZohoUtc(new Date(from).toISOString()), end: toZohoUtc(new Date(to).toISOString()) });
    for (const calendar of calendars) {
      const res = await fetch(`${ZOHO_CALENDAR_BASE}/calendars/${calendar.uid}/events?${new URLSearchParams({ range, byinstance: "true" })}`, {
        headers: authHeaders(accessToken),
      });
      if (res.status === 204) continue;
      const text = await res.text();
      if (!res.ok) throw new Error(`getBusyIntervals failed: ${res.status} ${text.slice(0, 300)}`);
      const events = text ? ((JSON.parse(text) as { events?: ZohoEvent[] }).events ?? []) : [];
      for (const event of events) {
        const dayOf = (value: unknown) => /^(d{4})(d{2})(d{2})/.exec(String(value ?? ""));
        if (event.isallday) {
          const first = dayOf(event.dateandtime?.start);
          const last = dayOf(event.dateandtime?.end);
          if (!first) continue;
          const startIso = `${first[1]}-${first[2]}-${first[3]}`;
          const endIso = last ? `${last[1]}-${last[2]}-${last[3]}` : startIso;
          busy.push(...allDayBusy(startIso, endIso, opts, { eventId: event.uid, title: event.title }));
          continue;
        }
        const start = parseZohoDateTime(event.dateandtime?.start);
        const end = parseZohoDateTime(event.dateandtime?.end);
        if (start === null || end === null || end <= start) continue;
        busy.push({ startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), eventId: event.uid, title: event.title });
      }
    }
  }
  return busy;
}

export type NewEvent = {
  calendarUid: string;
  title: string;
  startUtc: string;
  endUtc: string;
  timezone: string;
  description?: string;
  /** Invited by Zoho itself (it sends the invitation emails). */
  attendeeEmails?: string[];
  /** Hex colour for the event in the calendar view, e.g. "#8c8c8c" for a tentative hold. */
  color?: string;
};

async function postEvent(accessToken: string, opts: NewEvent, withExtras: boolean): Promise<Response> {
  const attendees = withExtras && opts.attendeeEmails?.length ? opts.attendeeEmails.map((email) => ({ email, attendance: 1 })) : undefined;
  const eventdata = JSON.stringify({
    title: opts.title,
    dateandtime: {
      start: toZohoUtc(opts.startUtc),
      end: toZohoUtc(opts.endUtc),
      timezone: opts.timezone,
    },
    ...(opts.description ? { description: opts.description } : {}),
    ...(withExtras && opts.color ? { color: opts.color } : {}),
    ...(attendees ? { attendees, notify_attendee: 1 } : {}),
  });
  return fetch(`${ZOHO_CALENDAR_BASE}/calendars/${opts.calendarUid}/events?${new URLSearchParams({ eventdata })}`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

/**
 * Creates the event with the guests invited (verified live) and the colour, if given (not yet
 * verified). If Zoho rejects the request with a 4xx the event is created without those extras
 * (and a warning logged) rather than losing the booking.
 */
export async function createEvent(accessToken: string, opts: NewEvent): Promise<{ eventId: string; etag: string }> {
  let res = await postEvent(accessToken, opts, true);
  if (!res.ok && res.status >= 400 && res.status < 500 && res.status !== 401 && (opts.attendeeEmails?.length || opts.color)) {
    console.warn(`createEvent with guests/colour was rejected (${res.status}): ${(await res.text()).slice(0, 300)} — retrying without them`);
    res = await postEvent(accessToken, opts, false);
  }
  if (!res.ok) throw new Error(`createEvent failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { events: { uid: string; etag: string }[] };
  return { eventId: data.events[0].uid, etag: data.events[0].etag };
}

/** The event's current etag (needed to delete it; it changes whenever the event is edited in Zoho). */
export async function getEventEtag(accessToken: string, opts: { calendarUid: string; eventId: string }): Promise<string> {
  const res = await fetch(`${ZOHO_CALENDAR_BASE}/calendars/${opts.calendarUid}/events/${opts.eventId}`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(`getEvent failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { events: { etag: string }[] };
  return data.events[0].etag;
}

/**
 * Zoho requires the event's etag (from createEvent/updateEvent's response) as an
 * `etag` header on delete — without it the API returns 400 ETAG_MISSING (found
 * live, Sep 29, 2026).
 */
export async function deleteEvent(accessToken: string, opts: { calendarUid: string; eventId: string; etag: string }): Promise<void> {
  const res = await fetch(`${ZOHO_CALENDAR_BASE}/calendars/${opts.calendarUid}/events/${opts.eventId}`, {
    method: "DELETE",
    headers: { ...authHeaders(accessToken), etag: opts.etag },
  });
  if (!res.ok) throw new Error(`deleteEvent failed: ${res.status} ${await res.text()}`);
}
