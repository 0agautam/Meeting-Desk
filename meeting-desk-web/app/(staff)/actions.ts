"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEW_ROLES, PREVIEW_ROLE_COOKIE, isPreviewRole } from "@/lib/preview-role";

/** Phase 1 role switcher. Validates input — never trust form values. */
export async function setPreviewRole(formData: FormData) {
  const role = formData.get("role");
  if (!isPreviewRole(role)) return;

  (await cookies()).set(PREVIEW_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(PREVIEW_ROLES.find((r) => r.value === role)!.home);
}
