"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addEvent, clearDraft, createRequest, saveDraft as saveDraftRow } from "@/lib/data";
import type { Attendee } from "@/lib/types";
import { DEFAULT_DURATION_MIN, DURATION_OPTIONS } from "@/components/requests/requestsContent";

const ALLOWED_DURATIONS = new Set<number>(DURATION_OPTIONS.map((d) => d.minutes));

function parseAttendees(formData: FormData, hostId: string): Attendee[] {
  const attendees: Attendee[] = [{ staffId: hostId, required: true }];
  for (const staffId of formData.getAll("requiredAttendee")) {
    if (typeof staffId === "string" && staffId && staffId !== hostId) attendees.push({ staffId, required: true });
  }
  for (const staffId of formData.getAll("optionalAttendee")) {
    if (typeof staffId === "string" && staffId && staffId !== hostId && !attendees.some((a) => a.staffId === staffId)) {
      attendees.push({ staffId, required: false });
    }
  }
  return attendees;
}

function parseEmailList(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

async function buildRequestInput(formData: FormData) {
  const hostId = String(formData.get("hostId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  if (!hostId || !subject) return null;

  const durationRaw = Number(formData.get("durationMin"));
  const durationMin = ALLOWED_DURATIONS.has(durationRaw) ? durationRaw : DEFAULT_DURATION_MIN;

  return {
    hostId,
    subject,
    to: parseEmailList(formData, "to"),
    cc: parseEmailList(formData, "cc"),
    attendees: parseAttendees(formData, hostId),
    durationMin,
    notes: String(formData.get("notes") ?? "").trim(),
    crmAccount: (formData.get("crmAccount") as string) || undefined,
  };
}

async function submitAndRedirect(formData: FormData, destination: (requestId: string) => string) {
  const input = await buildRequestInput(formData);
  if (!input) redirect("/requests");

  const request = await createRequest(input);
  await addEvent({ requestId: request.id, type: "submitted", actorId: request.hostId, version: 1 });
  await clearDraft(request.hostId);
  revalidatePath("/requests");
  redirect(destination(request.id));
}

/** "Submit to Celian" — creates the request and opens its detail/history page. */
export async function submitRequest(formData: FormData) {
  await submitAndRedirect(formData, (id) => `/requests/${id}`);
}

/** "Submit & start another" — creates the request, then returns to a blank form. */
export async function submitRequestAndStartAnother(formData: FormData) {
  await submitAndRedirect(formData, () => "/requests");
}

/** "Save draft" — remembers only the subject line (wireframe 1's dashed sidebar card). */
export async function saveRequestDraft(formData: FormData) {
  const hostId = String(formData.get("hostId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  if (hostId && subject) {
    await saveDraftRow(hostId, subject);
  }
  revalidatePath("/requests");
  redirect("/requests");
}
