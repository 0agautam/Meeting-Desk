import type { Metadata } from "next";
import BookingCard from "@/components/booking/BookingCard";
import ResultIcon from "@/components/booking/ResultIcon";
import { BOOKING_CONFIRMED } from "@/components/booking/bookingContent";
import { getBooking, getStaffBySlug } from "@/lib/data";
import { META, PANEL } from "@/lib/ui/classes";

export const metadata: Metadata = { title: BOOKING_CONFIRMED.metaTitle };

/** Wireframe 7. Reads the real booking + host by id, so this reflects what was actually saved. */
export default async function BookingConfirmedPage({
  params,
  searchParams,
}: PageProps<"/book/[slug]/confirmed">) {
  const { slug } = await params;
  const { bookingId } = await searchParams;
  const [host, booking] = await Promise.all([
    getStaffBySlug(slug),
    typeof bookingId === "string" ? getBooking(bookingId) : undefined,
  ]);

  const start = booking ? new Date(booking.startUtc) : undefined;
  const end = booking ? new Date(booking.endUtc) : undefined;
  const timeZone = host?.timezone ?? "America/Toronto";
  const range =
    start && end
      ? `${new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(start)} · ${new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(start)}–${new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "shortGeneric" }).format(end)}`
      : undefined;

  return (
    <BookingCard title={BOOKING_CONFIRMED.title} icon={<ResultIcon kind="success" />}>
      <div className={`${PANEL} flex flex-col gap-1.5`}>
        <b className="text-ink">{BOOKING_CONFIRMED.meetingWith(host?.name ?? "your host")}</b>
        {range ? <span>{range}</span> : null}
      </div>
      {booking ? <p className={META}>{BOOKING_CONFIRMED.invite(booking.clientEmail)}</p> : null}
      <p className={META}>{BOOKING_CONFIRMED.contact}</p>
    </BookingCard>
  );
}
