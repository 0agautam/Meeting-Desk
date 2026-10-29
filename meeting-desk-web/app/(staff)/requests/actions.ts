"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CrmAccessError } from "@/lib/crm/auth";
import { searchContacts, sanitizeSearchTerm, type CrmContact } from "@/lib/crm/zoho";
import { requireRole, requireUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/permissions";
import { addEvent, clearDraft, createRequest, listStaff, saveDraft as saveDraftRow } from "@/lib/data";
import { parseAttendees, parseEmailList } from "@/lib/requests/formParsing";
import type { Staff } from "@/lib/types";
import { DEFAULT_DURATION_MIN, DURATION_OPTIONS } from "@/components/requests/requestsContent";

const ALLOWED_DURATIONS = new Set<number>(DURATION_OPTIONS.map((d) => d.minutes));

export type CrmSearchResponse =
  | { ok: true; contacts: CrmContact[]; hasMore: boolean; leadsUnavailable?: boolean }
  | { ok: false; error: "too_short" | "unavailable" | "not_connected" | "reconnect"; detail?: string };

/** Live Zoho CRM client lookup for the new-request form (docs/RESEARCH.md §10). Contacts without an email come back with email: null so the form can show them as unusable. */
export async function searchCrmContacts(query: string): Promise<CrmSearchResponse> {
  const user = await requireUser();
  if (typeof query !== "string" || !sanitizeSearchTerm(query)) return { ok: false, error: "too_short" };
  try {
    return { ok: true, ...(await searchContacts(user.id, query)) };
  } catch (err) {
    if (err instanceof CrmAccessError) return { ok: false, error: err.kind, detail: err.detail };
    console.warn("searchCrmContacts failed:", err);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Which host a submission is for. A host can only ever submit for themselves (the form
 * value is ignored); an admin may choose any host. Returns null for anything else.
 */
async function resolveHostId(user: Staff, formData: FormData): Promise<string | null> {
  if (!isAdmin(user)) return user.id;
  const chosen = String(formData.get("hostId") ?? "");
  const hosts = (await listStaff()).filter((s) => s.roles.includes("host"));
  return hosts.some((h) => h.id === chosen) ? chosen : null;
}

async function buildRequestInput(formData: FormData, hostId: string, userId: string) {
  const subject = String(formData.get("subject") ?? "").trim();
  const host = (await listStaff()).find((s) => s.id === hostId);
  if (!host || !subject) return null;

  const durationRaw = Number(formData.get("durationMin"));
  const durationMin = ALLOWED_DURATIONS.has(durationRaw) ? durationRaw : DEFAULT_DURATION_MIN;

  const to = parseEmailList(formData, "to");

  return {
    hostId,
    subject,
    to,
    cc: parseEmailList(formData, "cc", to),
    attendees: await parseAttendees(formData, host.email, userId),
    durationMin,
    notes: String(formData.get("notes") ?? "").trim(),
    crmAccount: (formData.get("crmAccount") as string) || undefined,
  };
}

async function submitAndRedirect(formData: FormData, destination: (requestId: string) => string) {
  const user = await requireRole("host");
  const hostId = await resolveHostId(user, formData);
  const input = hostId ? await buildRequestInput(formData, hostId, user.id) : null;
  if (!input) redirect("/requests");

  const request = await createRequest(input);
  await addEvent({ requestId: request.id, type: "submitted", actorId: user.id, version: 1 });
  await clearDraft(request.hostId);
  revalidatePath("/requests");
  redirect(destination(request.id));
}

/** "Submit to the coordinator" — creates the request and opens its detail/history page. */
export async function submitRequest(formData: FormData) {
  await submitAndRedirect(formData, (id) => `/requests/${id}`);
}

/** "Submit & start another" — creates the request, then returns to a blank form. */
export async function submitRequestAndStartAnother(formData: FormData) {
  await submitAndRedirect(formData, () => "/requests");
}

/** "Save draft" — remembers only the subject line (wireframe 1's dashed sidebar card). */
export async function saveRequestDraft(formData: FormData) {
  const user = await requireRole("host");
  const hostId = (await resolveHostId(user, formData)) ?? "";
  const subject = String(formData.get("subject") ?? "").trim();
  if (hostId && subject) {
    await saveDraftRow(hostId, subject);
  }
  revalidatePath("/requests");
  redirect("/requests");
}
