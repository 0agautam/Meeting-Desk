import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_LIFETIME_HOURS } from "@/lib/config";
import { deleteSession, findSession, pruneExpiredSessions, saveSession } from "./sessionStore";

/**
 * Login session: at sign-in the app makes a random 256-bit token, stores its SHA-256 hash
 * in the database against the staff id, and gives the browser the token in an httpOnly
 * cookie. Every request looks the hash up, so there is no signing secret to manage, signing
 * out really ends the session, and a session can be revoked instantly. Roles are NOT stored
 * with the session — they're read fresh from the Staff row, so removing someone or changing
 * their roles takes effect immediately.
 */

export const SESSION_COOKIE = "md_session";
const MAX_AGE_SECONDS = SESSION_LIFETIME_HOURS * 60 * 60; // set in lib/config.ts

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(staff: { id: string; email: string }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await pruneExpiredSessions(staff.id);
  await saveSession(hashToken(token), {
    staffId: staff.id,
    staffEmail: staff.email,
    expiresAt: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** The signed-in staff id, or null when there's no cookie, no matching session, or it has expired. */
export async function readSession(): Promise<{ staffId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;

  const tokenHash = hashToken(token);
  const session = await findSession(tokenHash);
  if (!session) return null;
  if (session.expiresAt < Date.now() / 1000) {
    await deleteSession(tokenHash);
    return null;
  }
  return { staffId: session.staffId };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && /^[A-Za-z0-9_-]{20,100}$/.test(token)) await deleteSession(hashToken(token));
  jar.delete(SESSION_COOKIE);
}
