"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { ALL_ROLES } from "@/lib/auth/permissions";
import { deleteSessionsForStaff } from "@/lib/auth/sessionStore";
import { deleteCalendarAccount, getCalendarAccount } from "@/lib/calendar/accountStore";
import { revokeCalendarAccount } from "@/lib/calendar/revoke";
import { revokeRefreshToken } from "@/lib/calendar/zohoOauth";
import { deleteCrmAccount, getCrmAccount } from "@/lib/crm/accountStore";
import { createStaff, deleteStaff, getStaffByEmail, listRequests, listStaff, updateStaff } from "@/lib/data";
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

/** Wireframe 4's "Save" — updates a person's roles, calendar and buffer. Admin only. */
export async function saveStaffSettings(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("staffId") ?? "");
  const roles = parseRoles(formData);
  const calendarProvider = parseCalendar(formData);
  const bufferMin = Number(formData.get("bufferMin"));
  if (!id || roles.length === 0 || calendarProvider === undefined || !Number.isFinite(bufferMin)) {
    redirect("/settings");
  }

  // Never let the team end up with no admin (nobody could open Settings to fix it).
  const staff = await listStaff();
  const target = staff.find((s) => s.id === id);
  const otherAdmins = staff.filter((s) => s.id !== id && s.roles.includes("admin"));
  if (target?.roles.includes("admin") && !roles.includes("admin") && otherAdmins.length === 0) {
    redirect(`/settings?edit=${id}&error=last-admin`);
  }

  await updateStaff(id, { roles, calendarProvider, bufferMin });
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
  const bufferMin = Number(formData.get("bufferMin"));
  if (!name || !EMAIL_PATTERN.test(email) || roles.length === 0 || calendarProvider === undefined) {
    redirect("/settings?add=1&error=invalid");
  }
  if (await getStaffByEmail(email)) redirect("/settings?add=1&error=duplicate");

  await createStaff({
    name,
    email,
    roles,
    calendarProvider,
    bufferMin: Number.isFinite(bufferMin) ? bufferMin : 15,
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

  // Best effort: a provider that refuses the revoke must not keep the person on the team.
  try {
    const calendar = await getCalendarAccount(id);
    if (calendar) await revokeCalendarAccount(calendar);
    const crm = await getCrmAccount(id);
    if (crm) await revokeRefreshToken(crm.refreshToken);
  } catch (err) {
    console.warn(`deleteStaffMember: couldn't revoke approvals for ${id}:`, err);
  }
  await deleteCalendarAccount(id);
  await deleteCrmAccount(id);
  await deleteSessionsForStaff(id);
  await deleteStaff(id);
  revalidatePath("/settings");
  redirect("/settings");
}
