import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { saveCalendarAccount } from "@/lib/calendar/accountStore";
import { GOOGLE_CALENDAR_SCOPE, GOOGLE_STATE_COOKIE, exchangeGoogleCode, fetchGoogleEmail, googleClient, revokeGoogleToken } from "@/lib/calendar/googleOauth";
import { updateStaff } from "@/lib/data";
import { getBaseUrl } from "@/lib/http/baseUrl";
import { calendarEmailOf } from "@/lib/types";

export const dynamic = "force-dynamic";

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Where Google sends the browser back after the person approves. Same checks as the Zoho return: the person
 * is signed in here, the state matches, the Google account that approved is the one an admin expects for them (their
 * team-list email, or their calendar account email if one is set), and they really allowed calendar access (Google lets people untick it). Otherwise nothing is saved.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/google" }); // same path it was set with

  if (!expectedState || !sameText(params.get("state") ?? "", expectedState)) redirect("/account?google=state");
  if (params.get("error")) redirect("/account?google=denied");
  const code = params.get("code");
  if (!code) redirect("/account?google=error");
  const client = googleClient();
  if (!client) redirect("/account?google=not-configured");

  let outcome: string;
  try {
    const tokens = await exchangeGoogleCode({ code, redirectUri: `${await getBaseUrl()}/api/google/callback`, ...client });
    const approvedEmail = await fetchGoogleEmail(tokens.accessToken);

    if (approvedEmail.toLowerCase() !== calendarEmailOf(user).toLowerCase()) {
      await revokeGoogleToken(tokens.refreshToken);
      outcome = `mismatch&as=${encodeURIComponent(approvedEmail)}`;
    } else if (!tokens.scope.split(" ").includes(GOOGLE_CALENDAR_SCOPE)) {
      await revokeGoogleToken(tokens.refreshToken);
      outcome = "scope";
    } else {
      await saveCalendarAccount({
        staffId: user.id,
        provider: "google",
        refreshToken: tokens.refreshToken,
        accountEmail: approvedEmail,
        calendarUid: "primary",
        status: "connected",
      });
      if (user.calendarProvider !== "google") await updateStaff(user.id, { calendarProvider: "google" });
      outcome = "connected";
    }
  } catch (err) {
    console.warn("Google connect failed:", err);
    outcome = "error";
  }
  redirect(`/account?google=${outcome}`);
}
