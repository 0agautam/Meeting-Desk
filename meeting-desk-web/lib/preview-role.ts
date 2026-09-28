import "server-only";

import { cookies } from "next/headers";

/**
 * Phase 1 only: no login. A cookie remembers which view you are previewing.
 * Replaced by real staff login (Catalyst Authentication) in a later phase.
 */
export const PREVIEW_ROLE_COOKIE = "md_preview_role";

export const PREVIEW_ROLES = [
  { value: "host", label: "Host: Lior", staffId: "stf_lior", home: "/requests" },
  { value: "coordinator", label: "Celian", staffId: "stf_celian", home: "/desk" },
  { value: "admin", label: "Admin", staffId: null, home: "/settings" },
] as const;

export type PreviewRole = (typeof PREVIEW_ROLES)[number]["value"];

export function isPreviewRole(value: unknown): value is PreviewRole {
  return PREVIEW_ROLES.some((r) => r.value === value);
}

export async function getPreviewRole(): Promise<PreviewRole> {
  const value = (await cookies()).get(PREVIEW_ROLE_COOKIE)?.value;
  return isPreviewRole(value) ? value : "host";
}
