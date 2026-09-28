import type { Staff } from "@/lib/types";

const standardHours = { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" };

/** Phase 1 mock team. Replace with Data Store reads in lib/data only. */
export const MOCK_STAFF: Staff[] = [
  { id: "stf_lior", name: "Lior", email: "lior@example.com", role: "host", calendarProvider: "google", bufferMin: 15, workingHours: standardHours, timezone: "America/Toronto", slug: "lior" },
  { id: "stf_jatin", name: "Jatin", email: "jatin@example.com", role: "host", calendarProvider: "zoho", bufferMin: 15, workingHours: standardHours, timezone: "America/Toronto", slug: "jatin" },
  { id: "stf_roman", name: "Roman", email: "roman@example.com", role: "host", calendarProvider: "google", bufferMin: 10, workingHours: standardHours, timezone: "America/Toronto", slug: "roman" },
  { id: "stf_nelvin", name: "Nelvin", email: "nelvin@example.com", role: "host", calendarProvider: "zoho", bufferMin: 15, workingHours: standardHours, timezone: "America/Toronto", slug: "nelvin" },
  { id: "stf_celian", name: "Celian", email: "celian@example.com", role: "coordinator", calendarProvider: null, bufferMin: 0, workingHours: standardHours, timezone: "America/Toronto", slug: "celian" },
];
