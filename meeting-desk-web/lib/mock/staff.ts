import type { Staff } from "@/lib/types";

const standardHours = { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" };

/**
 * Local-development fallback only (used when the app isn't running on Catalyst) — the
 * real team lives in the Data Store "Staff" table. Mirrors it: one host, and one person
 * who is both coordinator and admin.
 */
export const MOCK_STAFF: Staff[] = [
  {
    id: "stf_ankit",
    name: "Ankit",
    email: "abr.ankit.gautam@gmail.com",
    roles: ["host"],
    calendarProvider: "zoho",
    bufferBeforeMin: 15,
    bufferAfterMin: 15,
    workingHours: standardHours,
    timezone: "America/Bogota",
    slug: "ankit",
  },
  {
    id: "stf_coordinator",
    name: "Barney Flintstones",
    email: "user1@demo5.amazingbusinessresults.com",
    roles: ["coordinator", "admin"],
    calendarProvider: null,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    workingHours: standardHours,
    timezone: "America/Toronto",
    slug: "coordinator",
  },
];
