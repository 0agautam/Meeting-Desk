import "server-only";
import type { CalendarAccount } from "./accountStore";
import { revokeGoogleToken } from "./googleOauth";
import { revokeRefreshToken } from "./zohoOauth";

/** Cancels a saved calendar permission at whichever provider it was given to. */
export async function revokeCalendarAccount(account: CalendarAccount): Promise<void> {
  if (account.provider === "google") await revokeGoogleToken(account.refreshToken);
  else await revokeRefreshToken(account.refreshToken);
}
