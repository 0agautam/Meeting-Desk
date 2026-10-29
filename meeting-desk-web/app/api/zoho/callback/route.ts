import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { saveCalendarAccount } from "@/lib/calendar/accountStore";
import {
  ZOHO_PURPOSE_COOKIE,
  ZOHO_STATE_COOKIE,
  exchangeCode,
  fetchApprovedEmail,
  fetchDefaultCalendarUid,
  revokeRefreshToken,
  zohoClient,
} from "@/lib/calendar/zohoOauth";
import { saveCrmAccount } from "@/lib/crm/accountStore";
import { updateStaff } from "@/lib/data";
import { getBaseUrl } from "@/lib/http/baseUrl";

export const dynamic = "force-dynamic";

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Where Zoho sends the browser back after the person approves. Only accepts the return if
 * (1) the person is signed in here, (2) the state value matches the one we started with, and
 * (3) the Zoho account that approved has the same email as their team-list entry — otherwise
 * the permission is cancelled and nothing is saved. The same address serves the calendar approval
 * and the CRM-only approval (for people whose calendar is Google); a cookie says which one this is.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const expectedState = jar.get(ZOHO_STATE_COOKIE)?.value;
  const crmOnly = jar.get(ZOHO_PURPOSE_COOKIE)?.value === "crm";
  // These cookies were set for the /api/zoho path, so they must be deleted with that same path or they linger for 10 minutes
  // (a lingering "crm" note once made the next calendar approval be saved as a CRM-only one).
  jar.delete({ name: ZOHO_STATE_COOKIE, path: "/api/zoho" });
  jar.delete({ name: ZOHO_PURPOSE_COOKIE, path: "/api/zoho" });
  const back = crmOnly ? "/account?crm=" : "/account?zoho=";

  if (!expectedState || !sameText(params.get("state") ?? "", expectedState)) redirect(`${back}state`);
  if (params.get("error")) redirect(`${back}denied`);
  const code = params.get("code");
  if (!code) redirect(`${back}error`);
  const client = zohoClient();
  if (!client) redirect(`${back}not-configured`);
  const accountsServer = params.get("accounts-server");
  if (accountsServer && !accountsServer.includes("accounts.zoho.com")) redirect(`${back}datacentre`);

  let outcome: string;
  try {
    const tokens = await exchangeCode({ code, redirectUri: `${await getBaseUrl()}/api/zoho/callback`, ...client });
    const approvedEmail = await fetchApprovedEmail(tokens.accessToken);

    if (approvedEmail.toLowerCase() !== user.email.toLowerCase()) {
      await revokeRefreshToken(tokens.refreshToken);
      outcome = `mismatch&as=${encodeURIComponent(approvedEmail)}`;
    } else if (crmOnly) {
      await saveCrmAccount({ staffId: user.id, refreshToken: tokens.refreshToken, accountEmail: approvedEmail, status: "connected" });
      outcome = "connected";
    } else {
      await saveCalendarAccount({
        staffId: user.id,
        provider: "zoho",
        refreshToken: tokens.refreshToken,
        accountEmail: approvedEmail,
        calendarUid: await fetchDefaultCalendarUid(tokens.accessToken),
        status: "connected",
      });
      if (user.calendarProvider !== "zoho") await updateStaff(user.id, { calendarProvider: "zoho" });
      outcome = "connected";
    }
  } catch (err) {
    console.warn("Zoho connect failed:", err);
    outcome = "error";
  }
  redirect(`${back}${outcome}`);
}
