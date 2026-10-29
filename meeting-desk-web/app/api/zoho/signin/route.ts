import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ZOHO_SIGNIN_SCOPES, ZOHO_STATE_COOKIE, buildAuthorizeUrl, zohoClient } from "@/lib/calendar/zohoOauth";
import { getBaseUrl } from "@/lib/http/baseUrl";

export const dynamic = "force-dynamic";

/**
 * "Continue with Zoho": sends the browser to Zoho to prove who it is. Someone already signed in to Zoho
 * in this browser (e.g. from the CRM tab) comes straight back with no form. Public, since it is the way in.
 */
export async function GET() {
  const client = zohoClient();
  if (!client) redirect("/login?error=not-configured");

  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(ZOHO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax", // must be sent when Zoho redirects the browser back
    secure: process.env.NODE_ENV === "production",
    path: "/api/zoho",
    maxAge: 10 * 60,
  });
  redirect(buildAuthorizeUrl({ clientId: client.clientId, redirectUri: `${await getBaseUrl()}/api/zoho/signin/callback`, state, scope: ZOHO_SIGNIN_SCOPES, signIn: true }));
}
