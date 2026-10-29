import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/permissions";
import { createSession } from "@/lib/auth/session";
import { ZOHO_STATE_COOKIE, exchangeSignInCode, fetchApprovedEmail, zohoClient } from "@/lib/calendar/zohoOauth";
import { getStaffByEmail } from "@/lib/data";
import { getBaseUrl } from "@/lib/http/baseUrl";

export const dynamic = "force-dynamic";

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Where Zoho sends the browser back after "Continue with Zoho". Zoho itself says which email this is, so (unlike the
 * email-only form) it is proof of identity: the email must be on the team list, then the session starts.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const expectedState = jar.get(ZOHO_STATE_COOKIE)?.value;
  jar.delete({ name: ZOHO_STATE_COOKIE, path: "/api/zoho" });

  if (!expectedState || !sameText(params.get("state") ?? "", expectedState)) redirect("/login?error=state");
  if (params.get("error")) redirect("/login?error=denied");
  const code = params.get("code");
  if (!code) redirect("/login?error=error");
  const client = zohoClient();
  if (!client) redirect("/login?error=not-configured");
  const accountsServer = params.get("accounts-server");
  if (accountsServer && !accountsServer.includes("accounts.zoho.com")) redirect("/login?error=datacentre");

  let email: string;
  try {
    const accessToken = await exchangeSignInCode({ code, redirectUri: `${await getBaseUrl()}/api/zoho/signin/callback`, ...client });
    email = await fetchApprovedEmail(accessToken);
  } catch (err) {
    console.warn("Zoho sign-in failed:", err);
    redirect("/login?error=error");
  }

  const staff = await getStaffByEmail(email);
  if (!staff || staff.roles.length === 0) redirect("/login?error=not-on-list");

  await createSession(staff);
  redirect(homePathFor(staff));
}
