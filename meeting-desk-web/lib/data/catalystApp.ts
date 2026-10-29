import "server-only";
import catalyst from "zcatalyst-sdk-node";
import { headers } from "next/headers";

type CatalystApp = ReturnType<typeof catalyst.initialize>;

/**
 * A Catalyst SDK app instance for the current request, or null when not running
 * inside Catalyst (e.g. local `next dev` — the x-zc-* headers Catalyst's own
 * infra injects don't exist there, so initialize() throws). Confirmed working
 * from Next.js Server Components/Actions/route handlers on AppSail, Sep 29, 2026
 * (docs/RESEARCH.md section 3) — Web Headers must be converted to a plain object
 * first, since the SDK does bracket-property lookups that fail on a Headers instance.
 */
export async function tryGetCatalystApp(): Promise<CatalystApp | null> {
  try {
    const requestHeaders = await headers();
    return catalyst.initialize({ headers: Object.fromEntries(requestHeaders.entries()) });
  } catch {
    return null;
  }
}
