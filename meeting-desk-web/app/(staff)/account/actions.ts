"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BUFFER_OPTIONS } from "@/components/settings/settingsContent";
import { requireUser } from "@/lib/auth/current-user";
import { deleteCalendarAccount, getCalendarAccount } from "@/lib/calendar/accountStore";
import { GOOGLE_STATE_COOKIE, buildGoogleAuthorizeUrl, googleClient } from "@/lib/calendar/googleOauth";
import { revokeCalendarAccount } from "@/lib/calendar/revoke";
import { ZOHO_CRM_SCOPES, ZOHO_PURPOSE_COOKIE, ZOHO_STATE_COOKIE, buildAuthorizeUrl, revokeRefreshToken, zohoClient } from "@/lib/calendar/zohoOauth";
import { deleteCrmAccount, getCrmAccount } from "@/lib/crm/accountStore";
import { updateStaff } from "@/lib/data";
import { getBaseUrl } from "@/lib/http/baseUrl";
import type { CalendarProvider } from "@/lib/types";

/** Providers a person can pick. */
const SELECTABLE_PROVIDERS: CalendarProvider[] = ["zoho", "google"];

/** A one-time state value, kept in a short-lived cookie and checked when the person returns from the provider. */
async function startState(cookieName: string, path: string): Promise<string> {
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(cookieName, state, {
    httpOnly: true,
    sameSite: "lax", // must be sent when the provider redirects the browser back to us
    secure: process.env.NODE_ENV === "production",
    path,
    maxAge: 10 * 60,
  });
  return state;
}

/** "Connect Zoho Calendar" — sends the person to Zoho to approve, remembering a one-time state value to check on return. */
export async function connectZoho() {
  await requireUser();
  const client = zohoClient();
  if (!client) redirect("/account?zoho=not-configured");

  // A calendar approval must never be mistaken for a CRM-only one, so drop any leftover "crm" note from an earlier attempt.
  (await cookies()).delete({ name: ZOHO_PURPOSE_COOKIE, path: "/api/zoho" });
  const state = await startState(ZOHO_STATE_COOKIE, "/api/zoho");
  redirect(buildAuthorizeUrl({ clientId: client.clientId, redirectUri: `${await getBaseUrl()}/api/zoho/callback`, state }));
}

/** "Connect Google Calendar" — the same, with Google. */
export async function connectGoogle() {
  const user = await requireUser();
  const client = googleClient();
  if (!client) redirect("/account?google=not-configured");

  const state = await startState(GOOGLE_STATE_COOKIE, "/api/google");
  redirect(buildGoogleAuthorizeUrl({ clientId: client.clientId, redirectUri: `${await getBaseUrl()}/api/google/callback`, state, loginHint: user.email }));
}

/** "Connect Zoho CRM" — a CRM-only approval, for people whose calendar isn't Zoho. Comes back through the same Zoho address. */
export async function connectZohoCrm() {
  await requireUser();
  const client = zohoClient();
  if (!client) redirect("/account?crm=not-configured");

  const state = await startState(ZOHO_STATE_COOKIE, "/api/zoho");
  (await cookies()).set(ZOHO_PURPOSE_COOKIE, "crm", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/zoho",
    maxAge: 10 * 60,
  });
  redirect(buildAuthorizeUrl({ clientId: client.clientId, redirectUri: `${await getBaseUrl()}/api/zoho/callback`, state, scope: ZOHO_CRM_SCOPES }));
}

/** "Disconnect" — cancels the saved calendar permission and forgets it. */
export async function disconnectCalendar() {
  const user = await requireUser();
  const account = await getCalendarAccount(user.id);
  if (account) {
    await revokeCalendarAccount(account);
    await deleteCalendarAccount(user.id);
  }
  revalidatePath("/account");
  redirect("/account?zoho=disconnected");
}

/** "Disconnect" for the separate CRM approval. */
export async function disconnectCrm() {
  const user = await requireUser();
  const account = await getCrmAccount(user.id);
  if (account) {
    await revokeRefreshToken(account.refreshToken);
    await deleteCrmAccount(user.id);
  }
  revalidatePath("/account");
  redirect("/account?crm=disconnected");
}

/** Changing provider drops the old connection: the person has to approve the new one (one provider at a time). */
export async function saveCalendarProvider(formData: FormData) {
  const user = await requireUser();
  const provider = String(formData.get("calendarProvider") ?? "") as CalendarProvider;
  if (!SELECTABLE_PROVIDERS.includes(provider)) redirect("/account");

  if (provider !== user.calendarProvider) {
    const account = await getCalendarAccount(user.id);
    if (account) {
      await revokeCalendarAccount(account);
      await deleteCalendarAccount(user.id);
    }
    await updateStaff(user.id, { calendarProvider: provider });
  }
  revalidatePath("/account");
  redirect("/account");
}

/** A host's own buffer between meetings. */
export async function saveMyBuffer(formData: FormData) {
  const user = await requireUser();
  const bufferMin = Number(formData.get("bufferMin"));
  if (!user.roles.includes("host") || !BUFFER_OPTIONS.some((o) => o.minutes === bufferMin)) redirect("/account");

  await updateStaff(user.id, { bufferMin });
  revalidatePath("/account");
  redirect("/account?saved=buffer");
}
