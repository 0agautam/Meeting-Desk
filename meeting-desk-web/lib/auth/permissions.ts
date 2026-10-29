import type { Staff, StaffRole } from "@/lib/types";

/**
 * Who can do what. Pure functions (no cookies/DB) so pages, actions and components all
 * ask the same questions. Admin can do everything.
 *
 *   host         submits requests, sees only their own, manages their own calendar settings
 *   coordinator  works the desk: sees every request, generates and sends the email
 *   admin        everything above, plus the team list in Settings
 */
export const ALL_ROLES: StaffRole[] = ["host", "coordinator", "admin"];

type WithRoles = Pick<Staff, "roles">;

export function isAdmin(user: WithRoles): boolean {
  return user.roles.includes("admin");
}

/** True if the user holds any of the given roles (admin always passes). */
export function hasAnyRole(user: WithRoles, ...roles: StaffRole[]): boolean {
  return isAdmin(user) || roles.some((r) => user.roles.includes(r));
}

/** Where a person lands after login: host → their requests, coordinator → the desk, admin-only → settings. */
export function homePathFor(user: WithRoles): string {
  if (user.roles.includes("host")) return "/requests";
  if (user.roles.includes("coordinator")) return "/desk";
  if (user.roles.includes("admin")) return "/settings";
  return "/login";
}

/** No `role` means every signed-in person sees the item. */
export const NAV_ITEMS: readonly { label: string; href: string; role?: StaffRole }[] = [
  { label: "My requests", href: "/requests", role: "host" },
  { label: "Meeting requests", href: "/desk", role: "coordinator" },
  { label: "Settings", href: "/settings", role: "admin" },
  { label: "My settings", href: "/account" },
];

export function navFor(user: WithRoles) {
  return NAV_ITEMS.filter((item) => !item.role || hasAnyRole(user, item.role));
}

export function roleLabel(roles: StaffRole[]): string {
  return roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(" · ");
}

/** Parses the comma-separated Data Store value ("coordinator,admin"), dropping anything unknown. */
export function parseRoles(value: unknown): StaffRole[] {
  const wanted = String(value ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase());
  return ALL_ROLES.filter((r) => wanted.includes(r));
}
