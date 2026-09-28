"use server";

import { revalidatePath } from "next/cache";
import { addEvent, getRequest, setRequestStatus } from "@/lib/data";

const CELIAN_ID = "stf_celian";

/** "Copy email" — called directly from the client (clipboard write happens there); just logs it. */
export async function logEmailCopied(requestId: string) {
  const request = await getRequest(requestId);
  if (!request) return;
  await addEvent({ requestId, type: "email_copied", actorId: CELIAN_ID, version: request.version });
  revalidatePath(`/desk/${requestId}`);
}

/** "Mark as sent" — moves the request to email_sent, waiting on the client. */
export async function markAsSent(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const request = await getRequest(requestId);
  if (!request) return;
  await setRequestStatus(requestId, "email_sent");
  await addEvent({ requestId, type: "marked_sent", actorId: CELIAN_ID, version: request.version });
  revalidatePath("/desk");
  revalidatePath(`/desk/${requestId}`);
}

/** "Ask {host} for info" — moves the request back to needs_info with Celian's question. */
export async function askForInfo(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const request = await getRequest(requestId);
  if (!request || !message) return;
  await setRequestStatus(requestId, "needs_info");
  await addEvent({ requestId, type: "info_requested", actorId: CELIAN_ID, message, version: request.version });
  revalidatePath("/desk");
  revalidatePath(`/desk/${requestId}`);
}
