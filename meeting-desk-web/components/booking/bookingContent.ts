/** Copy for the public booking pages (wireframes 5–8). Client-facing: keep it plain and friendly. */
export const BOOKING_PAGE = {
  metaTitle: "Book a meeting",
  meetWith: "Meet with",
  durationLabel: (min: number) => `${min < 60 ? `${min} min` : `${min / 60} hour${min > 60 ? "s" : ""}`}`,
  detailsTitle: "Your details",
  nameLabel: "Name",
  emailLabel: "Email",
  companyLabel: "Company",
  notesLabel: "Notes (optional)",
  pickDay: "Pick a day",
  pickTime: "Pick a time",
  noSlots: "No open times in this window — check back soon.",
  book: (label?: string) => (label ? `Book ${label}` : "Pick a time to continue"),
  bookHint: "We save your booking, then hold the slot. If it's already taken, we'll tell you right away.",
  wireframe: "5-booking-link.html (desktop) and 6-booking-link-phone.html (phone)",
  inactive: "This booking link is no longer active.",
} as const;

/** The page behind the link in the coordinator's email: only the times that email offered. */
export const BOOKING_OFFERED = {
  metaTitle: "Pick a time",
  pickTime: "Pick one of these times",
  timesNote: (timeZoneName: string) => `Times are in ${timeZoneName}.`,
  book: "Book this time",
  bookHint: "The meeting goes straight into the host's calendar, and a calendar invite is sent to you.",
  alreadyBooked: { title: "This meeting is already booked", lede: "Check your inbox for the calendar invite. Need a different time? Reply to the email you received." },
  inactive: { title: "This link isn't active right now", lede: "The times in your email may have changed. Reply to that email and we'll send you a fresh link." },
  noneLeft: { title: "Those times are no longer open", lede: "Someone else took them, or the calendar changed. Reply to the email and we'll offer new times." },
} as const;

export const BOOKING_CONFIRMED = {
  metaTitle: "Booked",
  title: "You're booked",
  meetingWith: (hostName: string) => `Meeting with ${hostName}`,
  invite: (email: string) => `A calendar invite is on its way to ${email}. Accept it to add the meeting to your calendar.`,
  contact: "Need to change it? Reply to the invite, or email user1@demo5.amazingbusinessresults.com.",
  wireframe: "7-booked.html",
} as const;

export const BOOKING_FAILED = {
  metaTitle: "Booking failed",
  title: "We couldn't book that time",
  taken: (when: string) => `${when} was just taken.`,
  lede: "Nothing was added to any calendar. Your details are kept, so you only need to pick another time.",
  retry: "Pick another time",
  contact: (ref: string) => `Still stuck? Email user1@demo5.amazingbusinessresults.com and mention reference #${ref}.`,
  wireframe: "8-booking-failed.html",
} as const;
