import "server-only";
import { listCrmUsers, type CrmUser } from "@/lib/crm/users";
import type { Attendee } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client addresses from the form's repeated fields; anything that isn't a real email is dropped, duplicates are removed. */
export function parseEmailList(formData: FormData, field: string, exclude: string[] = []): string[] {
  const seen = new Set(exclude.map((e) => e.toLowerCase()));
  const emails: string[] = [];
  for (const value of formData.getAll(field)) {
    if (typeof value !== "string") continue;
    const email = value.trim();
    if (!EMAIL_PATTERN.test(email) || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    emails.push(email);
  }
  return emails;
}

/**
 * The ABR people picked from the CRM list ("attendee" fields carry JSON). Each must be a real CRM
 * user: when the CRM list can be read, the name and id come from it and anything not in it is dropped;
 * if it can't be read, entries with a valid email are kept as submitted (so existing attendees survive
 * an edit while the CRM is unreachable). The host is never repeated.
 */
export async function parseAttendees(formData: FormData, hostEmail: string, userId: string): Promise<Attendee[]> {
  let crmUsers: CrmUser[] | null = null;
  try {
    crmUsers = await listCrmUsers(userId);
  } catch (err) {
    console.warn("parseAttendees: CRM user list unavailable, trusting the submitted attendees:", err);
  }

  const seen = new Set([hostEmail.toLowerCase()]);
  const attendees: Attendee[] = [];
  for (const value of formData.getAll("attendee")) {
    if (typeof value !== "string") continue;
    let picked: { id?: unknown; name?: unknown; email?: unknown };
    try {
      picked = JSON.parse(value);
    } catch {
      continue;
    }
    const email = typeof picked.email === "string" ? picked.email.trim() : "";
    if (!EMAIL_PATTERN.test(email) || seen.has(email.toLowerCase())) continue;
    const known = crmUsers?.find((u) => u.email.toLowerCase() === email.toLowerCase());
    // With the CRM list in hand, only people on it are accepted — except ones already on the request (kept as they were).
    if (crmUsers && !known && picked.id !== email) continue;
    seen.add(email.toLowerCase());
    attendees.push({
      name: known?.name ?? ((typeof picked.name === "string" ? picked.name.trim().slice(0, 100) : "") || email),
      email: known?.email ?? email,
      ...(known?.id ? { crmUserId: known.id } : {}),
    });
  }
  return attendees;
}
