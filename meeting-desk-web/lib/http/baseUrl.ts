import "server-only";
import { headers } from "next/headers";

/**
 * The public origin of this deployment (e.g. https://meeting-desk-….catalystappsail.com),
 * read from the request. AppSail's proxy sends x-forwarded-host with an explicit ":443",
 * which is stripped so links come out clean.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").replace(/:443$/, "");
  // AppSail's proxy reports x-forwarded-proto as "http" even though the public site is HTTPS,
  // so it can't be trusted: everything except local dev is https.
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}
