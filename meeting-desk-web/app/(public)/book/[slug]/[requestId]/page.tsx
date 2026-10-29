import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingCard from "@/components/booking/BookingCard";
import OfferedBookingForm from "@/components/booking/OfferedBookingForm";
import { BOOKING_OFFERED } from "@/components/booking/bookingContent";
import { busyForPeople, calendarPeople, slotIsFreeForAll } from "@/lib/booking/availability";
import { isBookable } from "@/lib/booking/offered";
import { getRequest, getStaffBySlug, listBookings, listStaff } from "@/lib/data";
import type { MeetingRequest, OfferedSlot, Staff } from "@/lib/types";
import { PANEL } from "@/lib/ui/classes";

export const metadata: Metadata = { title: BOOKING_OFFERED.metaTitle };

/**
 * The offered times that can still be booked: in the future, not already booked, and (if the
 * calendars can be read) not busy now. If a calendar can't be read the page still shows the
 * times; the booking itself re-checks before anything is created.
 */
async function openSlots(request: MeetingRequest, host: Staff): Promise<OfferedSlot[]> {
  const now = Date.now();
  const bookings = await listBookings(host.id);
  const taken = new Set(bookings.filter((b) => b.status !== "failed").map((b) => b.startUtc));
  let slots = request.offeredSlots.filter((s) => Date.parse(s.startUtc) > now && !taken.has(s.startUtc));
  if (slots.length === 0) return slots;

  try {
    const { checked } = calendarPeople(request, host, await listStaff());
    const busy = await busyForPeople(
      checked,
      {
        startUtc: new Date(now).toISOString(),
        endUtc: new Date(Math.max(...slots.map((s) => Date.parse(s.endUtc))) + 3_600_000).toISOString(),
      },
      request,
    );
    slots = slots.filter((s) => slotIsFreeForAll(s, busy));
  } catch (err) {
    console.warn(`openSlots: couldn't read calendars for request ${request.id}:`, err);
  }
  return slots;
}

/** The link in the coordinator's email. Public: shows only the host's first name, this request's offered times and the booking form. */
export default async function RequestBookingPage({ params }: PageProps<"/book/[slug]/[requestId]">) {
  const { slug, requestId } = await params;
  const request = /^[A-Za-z0-9_]+$/.test(requestId) ? await getRequest(requestId) : undefined;
  const host = await getStaffBySlug(slug);
  if (!host || !request || request.hostId !== host.id) notFound();

  if (request.status === "booked") return <BookingCard title={BOOKING_OFFERED.alreadyBooked.title} lede={BOOKING_OFFERED.alreadyBooked.lede} />;
  if (!isBookable(request)) return <BookingCard title={BOOKING_OFFERED.inactive.title} lede={BOOKING_OFFERED.inactive.lede} />;

  const slots = await openSlots(request, host);
  if (slots.length === 0) return <BookingCard title={BOOKING_OFFERED.noneLeft.title} lede={BOOKING_OFFERED.noneLeft.lede} />;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-8 py-10 max-md:px-4 max-md:py-6">
      <section className={PANEL}>
        <OfferedBookingForm
          slug={slug}
          requestId={request.id}
          hostName={host.name}
          durationMin={request.durationMin}
          timeZone={host.timezone}
          slots={slots}
        />
      </section>
    </div>
  );
}
