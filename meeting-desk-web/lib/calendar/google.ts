import "server-only";
import { allDayBusy, type BusyInterval, type BusyWindow } from "@/lib/booking/slots";
import type { NewEvent } from "./zoho";

/**
 * Google Calendar API calls, made with a person's own access token (see lib/calendar/access.ts).
 * Everything here acts as that Google user, on their primary calendar.
 */

const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

/** Google's grey ("Graphite") event colour; used for the tentative holds. */
const GRAPHITE_COLOR_ID = "8";

const headers = (accessToken: string, json = false): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

type GoogleEventTime = { dateTime?: string; date?: string };
type GoogleEvent = {
  id?: string;
  summary?: string;
  status?: string;
  eventType?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  attendees?: { self?: boolean; responseStatus?: string }[];
};

/**
 * Busy time from the events on the person's primary calendar, with repeating events already expanded
 * into single occurrences. Events are read (not Google's free/busy answer) so our own tentative holds
 * can be told apart by id and title. Anything on the calendar blocks the time: tasks, internal checks,
 * events marked "free", and all-day events (a day off blocks the person's working hours that day). Only cancelled
 * events, ones the person declined and Google's own "working location" / birthday markers are ignored.
 */
export async function getBusyIntervals(accessToken: string, opts: BusyWindow): Promise<BusyInterval[]> {
  const busy: BusyInterval[] = [];
  let pageToken: string | undefined;
  do {
    const qs = new URLSearchParams({
      timeMin: new Date(opts.startUtc).toISOString(),
      timeMax: new Date(opts.endUtc).toISOString(),
      singleEvents: "true",
      maxResults: "250",
      fields: "nextPageToken,items(id,summary,status,eventType,start,end,attendees(self,responseStatus))",
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/primary/events?${qs}`, { headers: headers(accessToken) });
    const text = await res.text();
    if (!res.ok) throw new Error(`getBusyIntervals failed: ${res.status} ${text.slice(0, 300)}`);
    const data = JSON.parse(text) as { items?: GoogleEvent[]; nextPageToken?: string };
    for (const event of data.items ?? []) {
      if (event.status === "cancelled" || event.eventType === "workingLocation" || event.eventType === "birthday") continue;
      if (event.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
      // All-day events carry dates (the end date is the day after the last day).
      if (event.start?.date && event.end?.date) {
        busy.push(...allDayBusy(event.start.date, event.end.date, opts, { eventId: event.id, title: event.summary }));
        continue;
      }
      const start = Date.parse(event.start?.dateTime ?? "");
      const end = Date.parse(event.end?.dateTime ?? "");
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
      busy.push({ startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), eventId: event.id, title: event.summary });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return busy;
}

/**
 * Creates the event. Guests are invited and emailed by Google; an event with a colour (the tentative
 * holds) is made grey. `calendarUid` is "primary" for a Google account.
 */
export async function createEvent(accessToken: string, opts: NewEvent): Promise<{ eventId: string; etag: string }> {
  const guests = opts.attendeeEmails?.length ? opts.attendeeEmails.map((email) => ({ email })) : undefined;
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(opts.calendarUid || "primary")}/events?${new URLSearchParams({ sendUpdates: guests ? "all" : "none" })}`, {
    method: "POST",
    headers: headers(accessToken, true),
    body: JSON.stringify({
      summary: opts.title,
      ...(opts.description ? { description: opts.description } : {}),
      start: { dateTime: new Date(opts.startUtc).toISOString(), timeZone: opts.timezone },
      end: { dateTime: new Date(opts.endUtc).toISOString(), timeZone: opts.timezone },
      transparency: "opaque",
      ...(guests ? { attendees: guests } : {}),
      ...(opts.color ? { colorId: GRAPHITE_COLOR_ID } : {}),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`createEvent failed: ${res.status} ${text.slice(0, 300)}`);
  const data = JSON.parse(text) as { id: string; etag?: string };
  return { eventId: data.id, etag: data.etag ?? "" };
}

/** Deletes the event (guests aren't emailed: it is used to remove our own holds). An event that is already gone counts as deleted. */
export async function deleteEvent(accessToken: string, opts: { calendarUid: string; eventId: string }): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(opts.calendarUid || "primary")}/events/${encodeURIComponent(opts.eventId)}?${new URLSearchParams({ sendUpdates: "none" })}`,
    { method: "DELETE", headers: headers(accessToken) },
  );
  if (res.ok || res.status === 404 || res.status === 410) return;
  throw new Error(`deleteEvent failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
}
