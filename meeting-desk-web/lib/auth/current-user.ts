import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/data";
import type { Staff, StaffRole } from "@/lib/types";
import { hasAnyRole, homePathFor } from "./permissions";
import { readSession } from "./session";

/**
 * Data access layer for "who is this?" (Next.js's recommended auth pattern). Every
 * protected page AND every Server Action calls requireUser/requireRole itself — Server
 * Actions are public endpoints, so hiding a button is never enough.
 */

/** The signed-in team member, or null. Cached per request so layout, page and actions share one lookup. */
export const getCurrentUser = cache(async (): Promise<Staff | null> => {
  const session = await readSession();
  if (!session) return null;
  const staff = await getStaff(session.staffId);
  return staff && staff.roles.length > 0 ? staff : null;
});

export async function requireUser(): Promise<Staff> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed in AND holding one of the roles (admin always qualifies); otherwise sent to their own home page. */
export async function requireRole(...roles: StaffRole[]): Promise<Staff> {
  const user = await requireUser();
  if (!hasAnyRole(user, ...roles)) redirect(homePathFor(user));
  return user;
}
