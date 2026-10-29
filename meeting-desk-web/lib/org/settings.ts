import "server-only";
import { ORGANISATION_CRM_ID } from "@/lib/crm/accountStore";
import { tryGetCatalystApp } from "@/lib/data/catalystApp";
import { zcqlLiteral } from "@/lib/data/dsHelpers";
import type { Staff, WorkingHours } from "@/lib/types";
import { isValidTimeZone, parseHours, type OrgSettings } from "./hours";

/**
 * The organisation's time zone and working hours, saved on the organisation's row of the Data Store table
 * "CrmAccounts" (columns org_timezone [Var Char] and business_hours [Text, JSON]). They are first fetched from the Zoho CRM when an
 * admin connects it, and an admin can change them in Settings. Everyone's slots, calendar events and displayed times use them.
 * Not running on Catalyst (local `next dev`): kept in memory, starting as Toronto, Monday to Friday 9 to 5.
 */

const TABLE = "CrmAccounts";
const CACHE_MS = 30_000;

type Saved = { timezone: string | null; hours: WorkingHours | null };
type Globals = typeof globalThis & { __meetingDeskOrgSettings?: { at: number; value: Saved }; __meetingDeskOrgSettingsMemory?: Saved };
const g = globalThis as Globals;

const DEV_DEFAULT: Saved = { timezone: "America/Toronto", hours: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" } };

/** What a person gets while the organisation has no hours saved: no working days, so no times are offered. */
export const NO_HOURS: WorkingHours = { days: [], start: "09:00", end: "17:00" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findRow(): Promise<Record<string, any> | null> {
  const app = await tryGetCatalystApp();
  if (!app) return null;
  const rows = await app.zcql().executeZCQLQuery(`SELECT * FROM ${TABLE} WHERE staff_id = ${zcqlLiteral(ORGANISATION_CRM_ID)}`);
  return rows[0]?.[TABLE] ?? null;
}

async function readSaved(): Promise<Saved> {
  if (!(await tryGetCatalystApp())) return (g.__meetingDeskOrgSettingsMemory ??= structuredClone(DEV_DEFAULT));
  const cached = g.__meetingDeskOrgSettings;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const row = await findRow();
  const timezone = row && isValidTimeZone(row.org_timezone) ? String(row.org_timezone) : null;
  const value: Saved = { timezone, hours: row ? parseHours(row.business_hours) : null };
  g.__meetingDeskOrgSettings = { at: Date.now(), value };
  return value;
}

/** What is saved so far (either part can be missing), for the Settings card. */
export async function getSavedOrgSettings(): Promise<Saved> {
  return readSaved();
}

/** The organisation's settings, or null until both the time zone and the hours are known. */
export async function getOrgSettings(): Promise<OrgSettings | null> {
  const saved = await readSaved();
  return saved.timezone && saved.hours ? { timezone: saved.timezone, hours: saved.hours } : null;
}

/** Saves the given parts (the other part is left as it is). Creates the organisation's row if the CRM hasn't been connected yet. */
export async function saveOrgSettings(patch: { timezone?: string; hours?: WorkingHours }): Promise<void> {
  const app = await tryGetCatalystApp();
  if (!app) {
    const memory = (g.__meetingDeskOrgSettingsMemory ??= structuredClone(DEV_DEFAULT));
    if (patch.timezone) memory.timezone = patch.timezone;
    if (patch.hours) memory.hours = patch.hours;
    return;
  }
  const values = {
    ...(patch.timezone ? { org_timezone: patch.timezone } : {}),
    ...(patch.hours ? { business_hours: JSON.stringify({ byDay: patch.hours.byDay }) } : {}),
  };
  const row = await findRow();
  const table = app.datastore().table(TABLE);
  if (row) await table.updateRow({ ROWID: row.ROWID, ...values });
  else await table.insertRow({ staff_id: ORGANISATION_CRM_ID, ...values });
  delete g.__meetingDeskOrgSettings;
}

/** A team member with the organisation's time zone and hours applied (they are no longer kept per person). */
export function withOrgSettings<T extends Staff>(staff: T, org: OrgSettings | null): T {
  return { ...staff, timezone: org?.timezone ?? "UTC", workingHours: org?.hours ?? NO_HOURS };
}
