"use server";

import { redirect } from "next/navigation";
import { LOGIN_PAGE } from "@/components/auth/authContent";
import { homePathFor } from "@/lib/auth/permissions";
import { createSession, destroySession } from "@/lib/auth/session";
import { getStaffByEmail } from "@/lib/data";

export type SignInState = { error: string } | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email-only sign in (Phase 1): the email must already be on the team list. This does not
 * prove who is typing — anyone who knows a team email can sign in as that person — so
 * real identity comes with "Connect Zoho", where Zoho itself verifies the user.
 */
export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return { error: LOGIN_PAGE.invalidEmail };

  const staff = await getStaffByEmail(email);
  if (!staff || staff.roles.length === 0) return { error: LOGIN_PAGE.notOnList };

  await createSession(staff);
  redirect(homePathFor(staff));
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
