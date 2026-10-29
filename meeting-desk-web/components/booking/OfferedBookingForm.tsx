import { submitRequestBooking } from "@/app/(public)/book/[slug]/[requestId]/actions";
import { formatSlot, timeZoneLabel } from "@/components/desk/deskContent";
import type { OfferedSlot } from "@/lib/types";
import { BTN_PRIMARY, FIELD_INPUT, FIELD_LABEL, FIELD_TEXTAREA, META } from "@/lib/ui/classes";
import { BOOKING_OFFERED, BOOKING_PAGE } from "./bookingContent";

/**
 * The client's booking form for one request: radio buttons for the times that were offered
 * (and nothing else), plus their details. Plain server-rendered form, no client JavaScript.
 */
export default function OfferedBookingForm({
  slug,
  requestId,
  hostName,
  durationMin,
  timeZone,
  slots,
}: {
  slug: string;
  requestId: string;
  hostName: string;
  durationMin: number;
  timeZone: string;
  slots: OfferedSlot[];
}) {
  return (
    <form action={submitRequestBooking} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="requestId" value={requestId} />

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-strong">
          {hostName.charAt(0)}
        </span>
        <div>
          <div className="text-xs text-muted">{BOOKING_PAGE.meetWith}</div>
          <div className="font-serif text-xl font-semibold text-ink">{hostName}</div>
        </div>
      </div>
      <div className="text-sm text-body">{BOOKING_PAGE.durationLabel(durationMin)}</div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={FIELD_LABEL}>{BOOKING_OFFERED.pickTime}</legend>
        {slots.map((slot, index) => (
          <label
            key={slot.startUtc}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border border-field-line bg-card px-3.5 text-sm font-medium text-ink has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-accent"
          >
            <input type="radio" name="slot" value={slot.startUtc} required={index === 0} className="sr-only" />
            {formatSlot(slot, timeZone)}
          </label>
        ))}
        <p className={`${META} m-0`}>{BOOKING_OFFERED.timesNote(timeZoneLabel(timeZone))}</p>
      </fieldset>

      <div className="flex flex-col gap-3.5 rounded-card border border-line p-4">
        <div className="font-semibold text-ink">{BOOKING_PAGE.detailsTitle}</div>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div>
            <label className={FIELD_LABEL} htmlFor="name">
              {BOOKING_PAGE.nameLabel}
            </label>
            <input id="name" name="name" required maxLength={100} autoComplete="name" className={FIELD_INPUT} />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor="email">
              {BOOKING_PAGE.emailLabel}
            </label>
            <input id="email" name="email" type="email" required maxLength={100} autoComplete="email" className={FIELD_INPUT} />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor="company">
              {BOOKING_PAGE.companyLabel}
            </label>
            <input id="company" name="company" maxLength={100} autoComplete="organization" className={FIELD_INPUT} />
          </div>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="notes">
            {BOOKING_PAGE.notesLabel}
          </label>
          <textarea id="notes" name="notes" rows={2} maxLength={1000} className={FIELD_TEXTAREA} style={{ minHeight: "56px" }} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" className={`${BTN_PRIMARY} self-start`}>
          {BOOKING_OFFERED.book}
        </button>
        <p className={`${META} m-0`}>{BOOKING_OFFERED.bookHint}</p>
      </div>
    </form>
  );
}
