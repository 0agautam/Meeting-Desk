"use server";

import { redirect } from "next/navigation";
import { createBooking, getStaffBySlug } from "@/lib/data";

/** Wireframe 5/6's "Book" — public, no login. Re-validated server-side regardless of the form. */
export async function submitBooking(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const startUtc = String(formData.get("startUtc") ?? "");
  const endUtc = String(formData.get("endUtc") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const host = await getStaffBySlug(slug);
  if (!host || host.role !== "host" || !startUtc || !endUtc || !name || !email) {
    redirect(`/book/${slug}`);
  }

  const result = await createBooking({
    hostId: host.id,
    startUtc,
    endUtc,
    clientName: name,
    clientEmail: email,
    company: company || undefined,
    notes: notes || undefined,
  });

  if (!result.ok) redirect(`/book/${slug}/failed?bookingId=${result.booking.id}`);

  // Not tied to a specific MeetingRequest yet (this is the generic self-serve link),
  // so there's no request to attach a "booked" RequestEvent to (see CLAUDE.md routes table).
  redirect(`/book/${slug}/confirmed?bookingId=${result.booking.id}`);
}
