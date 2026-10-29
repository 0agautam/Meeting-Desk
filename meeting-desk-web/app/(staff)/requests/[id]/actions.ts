"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/permissions";
import { releaseHolds } from "@/lib/booking/holds";
import { addEvent, getRequest, listStaff, updateRequestFields } from "@/lib/data";
import { parseAttendees, parseEmailList } from "@/lib/requests/formParsing";
import { isRequired, type RequestStatus } from "@/lib/types";

/** Statuses where the host can still change the request: up to the moment the coordinator marks the email as sent. */
const EDITABLE: RequestStatus[] = ["new", "needs_info", "updated"];

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const sameSet = (a: string[], b: string[]) => sameList([...a].map((v) => v.toLowerCase()).sort(), [...b].map((v) => v.toLowerCase()).sort());

/**
 * "Resubmit to the coordinator" (wireframe 2) — the host's edits, with an optional note (required
 * when answering a question), become a new version. Allowed until the email is marked as sent.
 * Recipients and ABR attendees are read exactly as when the request was first submitted.
 */
export async function resubmitRequest(formData: FormData) {
  const user = await requireRole("host");
  const requestId = String(formData.get("requestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const request = await getRequest(requestId);
  if (!request || (!isAdmin(user) && request.hostId !== user.id) || !EDITABLE.includes(request.status)) redirect(`/requests/${requestId}`);
  // Answering the coordinator's question needs an answer.
  if (request.status === "needs_info" && !message) redirect(`/requests/${requestId}`);
  const host = (await listStaff()).find((s) => s.id === request.hostId);
  if (!host) redirect(`/requests/${requestId}`);

  const durationRaw = Number(formData.get("durationMin"));
  const durationMin = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : request.durationMin;
  const subject = String(formData.get("subject") ?? "").trim() || request.subject;
  const notes = String(formData.get("notes") ?? "").trim();
  const to = parseEmailList(formData, "to");
  const cc = parseEmailList(formData, "cc", to);
  const attendees = await parseAttendees(formData, host.email, user.id);
  const crmAccount = String(formData.get("crmAccount") ?? "").trim();

  // Saving without changing anything (and without a note) shouldn't create a new version.
  const nothingChanged =
    subject === request.subject &&
    notes === request.notes &&
    durationMin === request.durationMin &&
    sameList(to, request.to) &&
    sameList(cc, request.cc) &&
    sameSet(attendees.map((a) => `${a.email}:${isRequired(a)}`), request.attendees.map((a) => `${a.email}:${isRequired(a)}`));
  if (nothingChanged && !message) redirect(`/requests/${requestId}`);

  // The edit throws away the offered times, so their grey holds come off the host's calendar too.
  await releaseHolds(request.hostId, request.offeredSlots);
  const { request: updated, changes } = await updateRequestFields(requestId, { subject, notes, to, cc, attendees, crmAccount, durationMin });

  await addEvent({
    requestId,
    type: message ? "host_replied" : "host_edited",
    actorId: user.id,
    message: message || undefined,
    changes,
    version: updated.version,
  });

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/desk");
  revalidatePath(`/desk/${requestId}`);
  redirect(`/requests/${requestId}`);
}
