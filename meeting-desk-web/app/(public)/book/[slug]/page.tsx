import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingForm from "@/components/booking/BookingForm";
import { BOOKING_PAGE } from "@/components/booking/bookingContent";
import { DEFAULT_BOOKING_DURATION_MIN, listAvailableDays, listDaySlots } from "@/lib/booking/slots";
import { getStaffBySlug, listBookings } from "@/lib/data";
import { PANEL } from "@/lib/ui/classes";

export const metadata: Metadata = { title: BOOKING_PAGE.metaTitle };

/** Wireframes 5 and 6. Public: only expose what the client needs (host name, free slots). */
export default async function BookingPage({ params }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const host = await getStaffBySlug(slug);
  if (!host || host.role !== "host") notFound();

  const bookings = await listBookings(host.id);
  const days = listAvailableDays(host);
  const slotsByDay = Object.fromEntries(days.map((day) => [day, listDaySlots(host, day, bookings)]));

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col px-8 py-10 max-md:px-4 max-md:py-6">
      <section className={PANEL}>
        <BookingForm
          slug={slug}
          hostName={host.name}
          timezone={host.timezone}
          durationMin={DEFAULT_BOOKING_DURATION_MIN}
          days={days}
          slotsByDay={slotsByDay}
        />
      </section>
    </div>
  );
}
