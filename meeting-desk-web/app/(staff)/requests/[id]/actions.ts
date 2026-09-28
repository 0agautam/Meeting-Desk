"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addEvent, getRequest, updateRequestFields } from "@/lib/data";

function parseEmailList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Wireframe 2's "Resubmit to Celian" — reply + edited fields become a new version. */
export async function resubmitRequest(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const request = await getRequest(requestId);
  if (!request || !message) redirect(`/requests/${requestId}`);

  const durationRaw = Number(formData.get("durationMin"));
  const durationMin = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : request.durationMin;

  const { request: updated, changes } = await updateRequestFields(requestId, {
    to: parseEmailList(formData.get("to")),
    cc: parseEmailList(formData.get("cc")),
    durationMin,
  });

  await addEvent({
    requestId,
    type: "host_replied",
    actorId: request.hostId,
    message,
    changes,
    version: updated.version,
  });

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  redirect(`/requests/${requestId}`);
}
