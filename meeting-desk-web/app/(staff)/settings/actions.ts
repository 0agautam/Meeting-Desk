"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { BUFFER_OPTIONS } from "@/components/settings/settingsContent";
import { ALL_ROLES } from "@/lib/auth/permissions";
import { deleteSessionsForStaff } from "@/lib/auth/sessionStore";
import { deleteCalendarAccount, getCalendarAccount } from "@/lib/calendar/accountStore";
import { revokeCalendarAccount } from "@/lib/calendar/revoke";
import { revokeRefreshToken } from "@/lib/calendar/zohoOauth";
import { deleteCrmAccount, getCrmAccount } from "@/lib/crm/accountStore";
import { CrmAccessError } from "@/lib/crm/auth";
import { copyBusinessHoursFromCrm } from "@/lib/crm/businessHours";
import { WEEKDAYS, hoursFromDays, isValidTimeZone } from "@/lib/org/hours";
import { getSavedOrgSettings, saveOrgSettings } from "@/lib/org/settings";
import { createStaff, deleteHostData, deleteStaff, getStaffByEmail, listRequests, listStaff, updateStaff } from "@/lib/data";
import type { CalendarProvider, StaffRole } from "@/lib/types";

const CALENDAR_VALUES: CalendarProvider[] = ["google", "zoho"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRoles(formData: FormData): StaffRole[] {
  const picked = formData.getAll("roles").map(String);
  return ALL_ROLES.filter((r) => picked.includes(r));
}

/** "" (none, e.g. a coordinator with no calendar) or a known provider; anything else is rejected. */
function parseCalendar(formData: FormData): CalendarProvider | null | undefined {
  const value = String(formData.get("calendarProvider") ?? "");
  if (value === "") return null;
  return CALENDAR_VALUES.includes(value as CalendarProvider) ? (value as CalendarProvider) : undefined;
}

/** The buffer before and after meetings, each one of the offered options; undefined if either is missing or unknown. */
function parseBuffers(formData: FormData): { bufferBeforeMin: number; bufferAfterMin: number } | undefined {
  const bufferBeforeMin = Number(formData.get("bufferBeforeMin"));
  const bufferAfterMin = Number(formData.get("bufferAfterMin"));
  const known = (minutes: number) => BUFFER_OPTIONS.some((o) => o.minutes === minutes);
  return known(bufferBeforeMin) && known(bufferAfterMin) ? { bufferBeforeMin, bufferAfterMin } : undefined;
}

/** Wireframe 4's "Save" — updates a person's roles, calendar and buffers. Admin only. */
export async function saveStaffSettings(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("staffId") ?? "");
  const roles = parseRoles(formData);
  const calendarProvider = parseCalendar(formData);
  const buffers = parseBuffers(formData);
  if (!id || roles.length === 0 || calendarProvider === undefined || !buffers) {
    redirect("/settings");
  }

  // Never let the team end up with no admin (nobody could open Settings to fix it).
  const staff = await listStaff();
  const target = staff.find((s) => s.id === id);
  const otherAdmins = staff.filter((s) => s.id !== id && s.roles.includes("admin"));
  if (target?.roles.includes("admin") && !roles.includes("admin") && otherAdmins.length === 0) {
    redirect(`/settings?edit=${id}&error=last-admin`);
  }

  await updateStaff(id, { roles, calendarProvider, ...buffers });
  revalidatePath("/settings");
  redirect("/settings");
}

/** Wireframe 4's "+ Add person" — adds a team member who can then sign in with their email. Admin only. */
export async function addStaff(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const roles = parseRoles(formData);
  const calendarProvider = parseCalendar(formData);
  const buffers = parseBuffers(formData);
  if (!name || !EMAIL_PATTERN.test(email) || roles.length === 0 || calendarProvider === undefined || !buffers) {
    redirect("/settings?add=1&error=invalid");
  }
  if (await getStaffByEmail(email)) redirect("/settings?add=1&error=duplicate");

  await createStaff({
    name,
    email,
    roles,
    calendarProvider,
    ...buffers,
  });
  revalidatePath("/settings");
  redirect("/settings");
}

/**
 * "Delete person" — removes a team member. Refused for yourself, for the last admin, and for anyone who still has
 * requests (those keep their host id; remove the host role instead). Their calendar and CRM approvals are cancelled
 * and forgotten, and they are signed out everywhere. Admin only.
 */
export async function deleteStaffMember(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("staffId") ?? "");
  const staff = await listStaff();
  const target = staff.find((s) => s.id === id);
  if (!target) redirect("/settings");

  const back = `/settings?edit=${id}&error=`;
  if (target.id === admin.id) redirect(`${back}self`);
  if (target.roles.includes("admin") && !staff.some((s) => s.id !== id && s.roles.includes("admin"))) redirect(`${back}last-admin`);
  if ((await listRequests({ hostId: id })).length > 0) redirect(`${back}has-requests`);

  await removeStaffAccount(id);
  revalidatePath("/settings");
  redirect("/settings");
}

/**
 * "Delete person and all their data" — the same as Delete person, but it also permanently removes the person's meeting
 * requests, their history and their booking records (and takes their grey holds off the calendars). Meetings already
 * booked stay in the calendars. Needs the confirmation box ticked. Refused for yourself and for the last admin. Admin only.
 */
export async function deleteStaffAndData(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("staffId") ?? "");
  const staff = await listStaff();
  const target = staff.find((s) => s.id === id);
  if (!target) redirect("/settings");

  const back = `/settings?edit=${id}&error=`;
  if (target.id === admin.id) redirect(`${back}self`);
  if (target.roles.includes("admin") && !staff.some((s) => s.id !== id && s.roles.includes("admin"))) redirect(`${back}last-admin`);
  if (String(formData.get("confirm") ?? "") !== "yes") redirect(`${back}confirm`);

  // The holds can only be taken off the calendars while the person's calendar approval still exists, so the data goes first.
  const removed = await deleteHostData(id);
  console.warn(`deleteStaffAndData: ${admin.email} deleted ${target.email} with ${removed.requests} requests, ${removed.events} history lines, ${removed.bookings} bookings.`);
  await removeStaffAccount(id);
  revalidatePath("/settings");
  redirect("/settings");
}

/** Cancels the person's calendar and CRM approvals, signs them out everywhere and removes them from the team. */
async function removeStaffAccount(id: string) {
  // Best effort: a provider that refuses the revoke must not keep the person on the team.
  try {
    const calendar = await getCalendarAccount(id);
    if (calendar) await revokeCalendarAccount(calendar);
    const crm = await getCrmAccount(id);
    if (crm) await revokeRefreshToken(crm.refreshToken);
  } catch (err) {
    console.warn(`removeStaffAccount: couldn't revoke approvals for ${id}:`, err);
  }
  await deleteCalendarAccount(id);
  await deleteCrmAccount(id);
  await deleteSessionsForStaff(id);
  await deleteStaff(id);
}

/** The organisation's time zone and working hours, typed in by an admin (one row per weekday: a tick plus start and end). */
export async function saveOrganisationHours(formData: FormData) {
  await requireRole("admin");
  const timezone = String(formData.get("timezone") ?? "");
  if (!isValidTimeZone(timezone)) redirect("/settings?hours=bad-timezone#org-hours-title");

  const entries = WEEKDAYS.filter((w) => formData.get(`day_${w.day}`) === "on").map((w) => ({
    day: w.day,
    start: String(formData.get(`start_${w.day}`) ?? ""),
    end: String(formData.get(`end_${w.day}`) ?? ""),
  }));
  const hours = hoursFromDays(entries);
  if (!hours) redirect("/settings?hours=bad-hours#org-hours-title");

  await saveOrgSettings({ timezone, hours });
  revalidatePath("/settings");
  redirect("/settings?hours=saved#org-hours-title");
}

/** "Refresh from CRM": replaces the saved time zone and hours with what the Zoho CRM has now. */
export async function refreshOrganisationHoursFromCrm() {
  await requireRole("admin");
  let outcome = "refreshed";
  try {
    const found = await copyBusinessHoursFromCrm({ onlyIfMissing: false, saved: await getSavedOrgSettings() });
    if (!found.timezone && !found.hours) outcome = "crm-empty";
  } catch (err) {
    outcome = err instanceof CrmAccessError ? "crm-not-connected" : "crm-error";
    if (outcome === "crm-error") console.warn("refreshOrganisationHoursFromCrm failed:", err);
  }
  revalidatePath("/settings");
  redirect(`/settings?hours=${outcome}#org-hours-title`);
}
