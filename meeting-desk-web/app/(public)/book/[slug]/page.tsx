import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingForm from "@/components/booking/BookingForm";
import { BOOKING_PAGE } from "@/components/booking/bookingContent";
import { getBusyForStaff, hasCalendar } from "@/lib/calendar/access";
import { DEFAULT_BOOKING_DURATION_MIN, listAvailableDays, listDaySlots, type BusyInterval } from "@/lib/booking/slots";
import { getStaffBySlug, listBookings } from "@/lib/data";
import type { Staff } from "@/lib/types";
import { PANEL } from "@/lib/ui/classes";

export const metadata: Metadata = { title: BOOKING_PAGE.metaTitle };

/**
 * Real calendar busy intervals for the whole picker window, or null if the calendar isn't connected or can't be
 * read. Then no times are shown (never working-hours-only times: a blocked time must not be offered), and the
 * page still renders rather than 500ing, since reading can fail for reasons outside our control (e.g. the
 * host's calendar approval was withdrawn).
 */
async function loadBusyIntervals(host: Staff): Promise<BusyInterval[] | null> {
  try {
    if (!(await hasCalendar(host.id))) return null;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return await getBusyForStaff(host.id, {
      startUtc: now.toISOString(),
      endUtc: windowEnd.toISOString(),
      timeZone: host.timezone,
      workHours: host.workingHours,
    });
  } catch (err) {
    console.warn(`loadBusyIntervals: couldn't read the calendar of host ${host.id}, offering no times:`, err);
    return null;
  }
}

/** Wireframes 5 and 6. Public: only expose what the client needs (host name, free slots). */
export default async function BookingPage({ params }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const host = await getStaffBySlug(slug);
  if (!host || !host.roles.includes("host")) notFound();

  const [bookings, busyIntervals] = await Promise.all([listBookings(host.id), loadBusyIntervals(host)]);
  const days = listAvailableDays(host);
  const slotsByDay = Object.fromEntries(
    days.map((day) => [day, busyIntervals ? listDaySlots(host, day, bookings, DEFAULT_BOOKING_DURATION_MIN, busyIntervals) : []]),
  );

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
