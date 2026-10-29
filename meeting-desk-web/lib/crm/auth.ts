import "server-only";
import { forgetCrmAccessToken, getZohoApiHeaders } from "@/lib/calendar/access";

/**
 * CRM access is each person's own Zoho approval (the "Connect Zoho" button in My settings), so
 * they only ever see what their own CRM permissions allow.
 *   not_connected  the person hasn't connected Zoho yet
 *   reconnect      Zoho refused the saved approval (withdrawn, or it predates a newly needed permission)
 * `detail` is Zoho's own error code (e.g. INVALID_TOKEN), shown so a refusal can be diagnosed.
 */
export class CrmAccessError extends Error {
  constructor(
    readonly kind: "not_connected" | "reconnect",
    readonly detail?: string,
  ) {
    super(kind);
  }
}

/** Authorization headers for CRM calls (the organisation's connection). Throws CrmAccessError if they can't be had. */
export async function crmHeaders(): Promise<Record<string, string>> {
  try {
    const headers = await getZohoApiHeaders();
    if (!headers) throw new CrmAccessError("not_connected");
    return headers;
  } catch (err) {
    if (err instanceof CrmAccessError) throw err;
    if (err instanceof Error && err.message === "invalid_code") throw new CrmAccessError("reconnect", "invalid_code");
    throw err;
  }
}

/** Zoho answers 401 (INVALID_TOKEN / OAUTH_SCOPE_MISMATCH) when the token is dead or lacks a permission the call needs. The cached token is dropped so the next try gets a fresh one. */
export async function assertCrmAuthorized(res: Response): Promise<void> {
  if (res.status !== 401) return;
  forgetCrmAccessToken();
  let code = "";
  try {
    code = String(((await res.clone().json()) as { code?: unknown }).code ?? "");
  } catch {
    // Body wasn't JSON; the status alone is enough.
  }
  throw new CrmAccessError("reconnect", code || "401");
}
