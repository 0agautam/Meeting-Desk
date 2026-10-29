"use server";

import { redirect } from "next/navigation";
import { addEvent, createBooking, getRequest, getStaffBySlug, setRequestStatus } from "@/lib/data";
import { isBookable } from "@/lib/booking/offered";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The client's "Book this time" for one request. Public, so everything is re-checked here:
 * the request belongs to this host's link, it is still open, and the chosen time is one of
 * the times that were actually offered (never trust the form for the end time or the host).
 */
export async function submitRequestBooking(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  const startUtc = String(formData.get("slot") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().slice(0, 100);
  const company = String(formData.get("company") ?? "").trim().slice(0, 100);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  const here = `/book/${encodeURIComponent(slug)}/${encodeURIComponent(requestId)}`;

  const [host, request] = await Promise.all([getStaffBySlug(slug), /^[A-Za-z0-9_]+$/.test(requestId) ? getRequest(requestId) : undefined]);
  if (!host || !request || request.hostId !== host.id || !isBookable(request)) redirect(here);
  const slot = request.offeredSlots.find((s) => s.startUtc === startUtc);
  if (!slot || !name || !EMAIL.test(email)) redirect(here);

  const result = await createBooking({
    requestId: request.id,
    hostId: host.id,
    startUtc: slot.startUtc,
    endUtc: slot.endUtc,
    clientName: name,
    clientEmail: email,
    company: company || undefined,
    notes: notes || undefined,
  });

  // The client isn't a staff member, so the history line names the host as the actor and carries the client's name.
  if (!result.ok) {
    await addEvent({ requestId: request.id, type: "booking_failed", actorId: host.id, message: result.booking.failureReason, version: request.version });
    redirect(`/book/${encodeURIComponent(slug)}/failed?bookingId=${result.booking.id}`);
  }

  await setRequestStatus(request.id, "booked");
  await addEvent({ requestId: request.id, type: "booked", actorId: host.id, message: name, version: request.version });
  redirect(`/book/${encodeURIComponent(slug)}/confirmed?bookingId=${result.booking.id}`);
}
