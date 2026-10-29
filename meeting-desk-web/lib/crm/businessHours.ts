import "server-only";
import { hoursFromDays, isValidTimeZone, normalizeTime, WEEKDAYS, type OrgSettings } from "@/lib/org/hours";
import { saveOrgSettings } from "@/lib/org/settings";
import { assertCrmAuthorized, crmHeaders } from "./auth";

/**
 * The organisation's business hours and time zone, read from the Zoho CRM (Setup > Company Settings > Business hours).
 * Times are 24-hour "HH:MM" in the organisation's time zone; the time zone is an IANA name, so daylight saving follows it.
 */

const URL = "https://www.zohoapis.com/crm/v8/settings/business_hours";

type Timing = [unknown, unknown] | null | undefined;
type ZohoBusinessHours = {
  business_days?: string[];
  same_as_everyday?: boolean;
  daily_timing?: Timing;
  custom_timing?: { days?: string | string[]; business_timing?: Timing }[];
  timezone?: string;
};

function pair(timing: Timing): { start: string; end: string } | null {
  if (!Array.isArray(timing)) return null;
  const start = normalizeTime(timing[0]);
  const end = normalizeTime(timing[1]);
  return start && end ? { start, end } : null;
}

/** What Zoho has: the time zone and the hours, either of which can be missing if the CRM doesn't have them set. */
export type CrmBusinessHours = { timezone: string | null; hours: OrgSettings["hours"] | null };

export function parseBusinessHours(body: unknown): CrmBusinessHours {
  const raw = ((body as { business_hours?: ZohoBusinessHours | ZohoBusinessHours[] } | null)?.business_hours ?? null) as ZohoBusinessHours | ZohoBusinessHours[] | null;
  const hours = Array.isArray(raw) ? raw[0] : raw;
  if (!hours) return { timezone: null, hours: null };

  const custom = new Map<string, { start: string; end: string }>();
  for (const entry of hours.custom_timing ?? []) {
    const times = pair(entry.business_timing);
    if (!times) continue;
    for (const day of Array.isArray(entry.days) ? entry.days : [entry.days]) if (day) custom.set(day, times);
  }
  const everyday = pair(hours.daily_timing);

  const entries: { day: number; start: string; end: string }[] = [];
  for (const name of hours.business_days ?? []) {
    const day = WEEKDAYS.find((w) => w.name.toLowerCase() === name.toLowerCase())?.day;
    const times = custom.get(name) ?? everyday;
    if (day !== undefined && times) entries.push({ day, ...times });
  }
  return {
    timezone: isValidTimeZone(hours.timezone) ? hours.timezone : null,
    hours: hoursFromDays(entries),
  };
}

/** Reads the business hours with the organisation's CRM approval. Throws CrmAccessError if there is none or it must be renewed. */
export async function fetchCrmBusinessHours(): Promise<CrmBusinessHours> {
  const headers = await crmHeaders();
  const res = await fetch(URL, { headers });
  await assertCrmAuthorized(res);
  if (res.status === 204) return { timezone: null, hours: null };
  const text = await res.text();
  if (!res.ok) throw new Error(`CRM business hours failed: ${res.status} ${text.slice(0, 300)}`);
  return parseBusinessHours(JSON.parse(text));
}

/**
 * Fetches the business hours and saves what Zoho has. `onlyIfMissing` leaves anything an admin already saved alone (used when the
 * CRM is connected); without it everything is replaced (the "Refresh from CRM" button). Returns what was found.
 */
export async function copyBusinessHoursFromCrm(opts: { onlyIfMissing: boolean; saved: { timezone: string | null; hours: unknown } }): Promise<CrmBusinessHours> {
  const found = await fetchCrmBusinessHours();
  const patch = {
    ...(found.timezone && !(opts.onlyIfMissing && opts.saved.timezone) ? { timezone: found.timezone } : {}),
    ...(found.hours && !(opts.onlyIfMissing && opts.saved.hours) ? { hours: found.hours } : {}),
  };
  if (patch.timezone || patch.hours) await saveOrgSettings(patch);
  return found;
}
