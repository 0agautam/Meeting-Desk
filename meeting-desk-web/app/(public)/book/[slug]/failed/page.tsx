import type { Metadata } from "next";
import Link from "next/link";
import BookingCard from "@/components/booking/BookingCard";
import ResultIcon from "@/components/booking/ResultIcon";
import { BOOKING_FAILED } from "@/components/booking/bookingContent";
import { getBooking, getStaffBySlug } from "@/lib/data";
import { BTN_PRIMARY, META, PANEL } from "@/lib/ui/classes";

export const metadata: Metadata = { title: BOOKING_FAILED.metaTitle };

/** Wireframe 8 — show the reason (from the real failed booking row) and a way back to the picker. */
export default async function BookingFailedPage({ params, searchParams }: PageProps<"/book/[slug]/failed">) {
  const { slug } = await params;
  const { bookingId } = await searchParams;
  const [host, booking] = await Promise.all([
    getStaffBySlug(slug),
    typeof bookingId === "string" ? getBooking(bookingId) : undefined,
  ]);

  const timeZone = host?.timezone ?? "America/Toronto";
  const when = booking
    ? `${new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(new Date(booking.startUtc))} · ${new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "shortGeneric" }).format(new Date(booking.startUtc))}`
    : "That time";
  const ref = booking ? booking.id.slice(-6).toUpperCase() : "UNKNOWN";
  // "That time was just taken" gets the wireframe's specific-time wording; any other
  // reason (e.g. a real calendar error — lib/data/index.ts createBooking) shows as-is.
  const message =
    !booking?.failureReason || booking.failureReason === "That time was just taken."
      ? BOOKING_FAILED.taken(when)
      : booking.failureReason;

  return (
    <BookingCard title={BOOKING_FAILED.title} lede={BOOKING_FAILED.lede} icon={<ResultIcon kind="warning" />}>
      <div className={`${PANEL} flex flex-col gap-1`}>
        <b className="text-ink">{message}</b>
      </div>
      <Link href={booking?.requestId ? `/book/${slug}/${booking.requestId}` : `/book/${slug}`} className={`${BTN_PRIMARY} self-start`}>
        {BOOKING_FAILED.retry}
      </Link>
      <p className={META}>{BOOKING_FAILED.contact(ref)}</p>
    </BookingCard>
  );
}
