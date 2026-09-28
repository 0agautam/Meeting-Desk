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

export const BOOKING_CONFIRMED = {
  metaTitle: "Booked",
  title: "You're booked",
  meetingWith: (hostName: string) => `Meeting with ${hostName}`,
  invite: (email: string) => `A calendar invite is on its way to ${email}. Accept it to add the meeting to your calendar.`,
  contact: "Need to change it? Reply to the invite, or email celian@amazingbusinessresults.ca.",
  wireframe: "7-booked.html",
} as const;

export const BOOKING_FAILED = {
  metaTitle: "Booking failed",
  title: "We couldn't book that time",
  taken: (when: string) => `${when} was just taken.`,
  lede: "Nothing was added to any calendar. Your details are kept, so you only need to pick another time.",
  retry: "Pick another time",
  contact: (ref: string) => `Still stuck? Email celian@amazingbusinessresults.ca and mention reference #${ref}.`,
  wireframe: "8-booking-failed.html",
} as const;
