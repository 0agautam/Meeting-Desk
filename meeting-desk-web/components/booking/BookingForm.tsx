"use client";

import { useState } from "react";
import { submitBooking } from "@/app/(public)/book/[slug]/actions";
import { formatDayLabel, formatShortDayLabel } from "@/lib/booking/slots";
import { BTN_PRIMARY, CHIP, CHIP_ACTIVE, FIELD_INPUT, FIELD_LABEL, FIELD_TEXTAREA } from "@/lib/ui/classes";
import { BOOKING_PAGE } from "./bookingContent";

type Slot = { startUtc: string; endUtc: string; label: string };

export default function BookingForm({
  slug,
  hostName,
  timezone,
  durationMin,
  days,
  slotsByDay,
}: {
  slug: string;
  hostName: string;
  timezone: string;
  durationMin: number;
  days: string[];
  slotsByDay: Record<string, Slot[]>;
}) {
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>(undefined);
  const slots = slotsByDay[selectedDay] ?? [];

  function pickDay(day: string) {
    setSelectedDay(day);
    setSelectedSlot(undefined);
  }

  return (
    <form action={submitBooking} className="flex flex-col gap-5 md:grid md:grid-cols-[1fr_260px] md:items-start md:gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-strong">
            {hostName.charAt(0)}
          </span>
          <div>
            <div className="text-xs text-muted">{BOOKING_PAGE.meetWith}</div>
            <div className="font-serif text-xl font-semibold text-ink">{hostName}</div>
          </div>
        </div>
        <div className="text-sm text-body">
          {BOOKING_PAGE.durationLabel(durationMin)} · {timezone.replace("_", " ")}
        </div>

        <div>
          <div className={FIELD_LABEL}>{BOOKING_PAGE.pickDay}</div>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const { weekday, day: dayNum } = formatShortDayLabel(day, timezone);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-card border text-sm ${
                    day === selectedDay ? "border-accent bg-accent text-white" : "border-field-line bg-card text-ink"
                  }`}
                >
                  <span className="text-xs">{weekday}</span>
                  <b>{dayNum}</b>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className={FIELD_LABEL}>{BOOKING_PAGE.pickTime}</div>
          {slots.length === 0 ? (
            <p className="text-sm text-muted">{BOOKING_PAGE.noSlots}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.startUtc}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={slot.startUtc === selectedSlot?.startUtc ? CHIP_ACTIVE : CHIP}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5 rounded-card border border-line p-4">
          <div className="font-semibold text-ink">{BOOKING_PAGE.detailsTitle}</div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label className={FIELD_LABEL} htmlFor="name">
                {BOOKING_PAGE.nameLabel}
              </label>
              <input id="name" name="name" required className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="email">
                {BOOKING_PAGE.emailLabel}
              </label>
              <input id="email" name="email" type="email" required className={FIELD_INPUT} />
            </div>
            <div>
              <label className={FIELD_LABEL} htmlFor="company">
                {BOOKING_PAGE.companyLabel}
              </label>
              <input id="company" name="company" className={FIELD_INPUT} />
            </div>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor="notes">
              {BOOKING_PAGE.notesLabel}
            </label>
            <textarea id="notes" name="notes" rows={2} className={FIELD_TEXTAREA} style={{ minHeight: "56px" }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:sticky md:top-4">
        {selectedSlot ? <div className="text-sm text-ink">{formatDayLabel(selectedDay, timezone)}</div> : null}
        <button type="submit" disabled={!selectedSlot} className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}>
          {BOOKING_PAGE.book(selectedSlot?.label)}
        </button>
        <p className="text-xs text-muted">{BOOKING_PAGE.bookHint}</p>
        {selectedSlot ? (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="startUtc" value={selectedSlot.startUtc} />
            <input type="hidden" name="endUtc" value={selectedSlot.endUtc} />
          </>
        ) : null}
      </div>
    </form>
  );
}
