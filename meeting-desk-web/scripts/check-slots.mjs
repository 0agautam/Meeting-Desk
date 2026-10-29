// Run: node scripts/check-slots.mjs. Compiles lib/booking/slots.ts on the fly and checks the day rule, days off and the multi-calendar slot picking.
import assert from "node:assert";
import fs from "node:fs";
import ts from "typescript";

const src = fs.readFileSync(new URL("../lib/booking/slots.ts", import.meta.url), "utf8");
const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function("module", "exports", out)(m, m.exports); // slots.ts has no runtime imports
const { listAvailableDays, suggestSlots, allDayBusy } = m.exports;

const host = { timezone: "America/Toronto", bufferBeforeMin: 15, bufferAfterMin: 15, workingHours: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" } };
const at = (iso) => new Date(`${iso}-04:00`); // Toronto is UTC-4 until Nov 1

// Day rule: skip today and the next working day.
const first = (iso, opts) => listAvailableDays(host, 3, { ...opts, now: at(iso) })[0];
assert.equal(first("2026-10-26T10:00"), "2026-10-28", "Monday -> Wednesday");
assert.equal(first("2026-10-23T10:00"), "2026-10-27", "Friday -> Tuesday");
assert.equal(first("2026-10-22T10:00"), "2026-10-26", "Thursday -> Monday");
assert.equal(first("2026-10-24T10:00"), "2026-10-27", "Saturday -> Tuesday");
assert.equal(first("2026-10-28T10:00"), "2026-10-30", "Wednesday -> Friday");
assert.equal(first("2026-10-26T10:00", { urgency: "soon" }), "2026-10-27", "soon Monday -> Tuesday");
assert.equal(first("2026-10-23T10:00", { urgency: "soon" }), "2026-10-26", "soon Friday -> Monday");
assert.equal(first("2026-10-26T10:00", { urgency: "today" }), "2026-10-26", "today Monday -> today");
assert.equal(first("2026-10-24T10:00", { urgency: "today" }), "2026-10-26", "today on a Saturday -> Monday");
// 22:00 Toronto is already the next day in UTC; the host's own date must be used.
assert.equal(first("2026-10-26T22:00"), "2026-10-28", "Monday evening -> Wednesday");

// Slot picking: the host's whole Wednesday is blocked (all-day), so the first offer moves to Thursday.
const person = { timeZone: "America/Toronto", workHours: { start: "09:00", end: "17:00" } };
const wed = allDayBusy("2026-10-28", "2026-10-29", person)[0];
assert.equal(wed.startTime, "2026-10-28T13:00:00.000Z", "a day off blocks 9:00 Toronto...");
assert.equal(wed.endTime, "2026-10-28T21:00:00.000Z", "...to 17:00 Toronto, nothing more");
assert.equal(allDayBusy("2026-10-28", "2026-10-31", person).length, 3, "a 3-day event blocks 3 days of working hours");
const args = { durationMin: 30, bookings: [], now: at("2026-10-26T10:00") };
let slots = suggestSlots(host, { ...args, busy: [] });
assert.equal(slots[0].startUtc, "2026-10-28T13:00:00.000Z", "Wednesday 9:00 Toronto");
slots = suggestSlots(host, { ...args, busy: [wed] });
assert.equal(slots[0].startUtc, "2026-10-29T13:00:00.000Z", "all-day block skips Wednesday");

// An invited teammate busy 9:00-10:00 Wednesday pushes the offer later, with THEIR buffer (30 min).
const mate = { bufferBeforeMin: 30, bufferAfterMin: 30, busy: [{ startTime: "2026-10-28T13:00:00Z", endTime: "2026-10-28T14:00:00Z" }] };
slots = suggestSlots(host, { ...args, busy: [], attendeeBusy: [mate] });
assert.equal(slots[0].startUtc, "2026-10-28T14:30:00.000Z", "10:30 Toronto = busy end + 30 min buffer");

// A block at the very end of the shift still blocks that slot (4:30-5:00 pm), so the last slot is not offered.
const endOfShift = { startTime: "2026-10-28T20:30:00Z", endTime: "2026-10-28T21:00:00Z" };
const all = suggestSlots(host, { ...args, count: 1, busy: [endOfShift], constraints: { earliestDate: "2026-10-28", latestDate: "2026-10-28", avoidWeekdays: [], timeOfDay: "any", notBeforeTime: "16:00", notAfterTime: null, urgency: "normal", other: "" } });
assert.equal(all.length, 0, "nothing free at 16:00-17:00 when 16:30-17:00 is blocked (with buffer)");

// Urgency "today": Monday 10:00 Toronto offers today from 12:00 (2 hours notice); "soon" starts Tuesday 9:00.
const withUrgency = (urgency) => ({ earliestDate: null, latestDate: null, avoidWeekdays: [], timeOfDay: "any", notBeforeTime: null, notAfterTime: null, urgency, other: "" });
slots = suggestSlots(host, { ...args, busy: [], constraints: withUrgency("today") });
assert.equal(slots[0].startUtc, "2026-10-26T16:00:00.000Z", "today from 12:00 Toronto");
slots = suggestSlots(host, { ...args, busy: [], constraints: withUrgency("soon") });
assert.equal(slots[0].startUtc, "2026-10-27T13:00:00.000Z", "soon -> Tuesday 9:00");

// Separate buffers: a teammate busy 9:00-10:00 who wants 0 minutes before and 60 after a meeting.
// "Before" keeps time free after the busy block ends (0 -> 10:00 is fine); "after" keeps time free before the next busy block starts.
const early = { bufferBeforeMin: 0, bufferAfterMin: 60, busy: [{ startTime: "2026-10-28T13:00:00Z", endTime: "2026-10-28T14:00:00Z" }] };
slots = suggestSlots(host, { ...args, busy: [], attendeeBusy: [early] });
assert.equal(slots[0].startUtc, "2026-10-28T14:00:00.000Z", "before = 0: can start right when the busy block ends (10:00 Toronto)");
const lateBusy = { bufferBeforeMin: 0, bufferAfterMin: 60, busy: [{ startTime: "2026-10-28T15:00:00Z", endTime: "2026-10-28T16:00:00Z" }] };
slots = suggestSlots(host, { ...args, busy: [], attendeeBusy: [lateBusy] });
assert.equal(slots[0].startUtc, "2026-10-28T13:00:00.000Z", "9:00-9:30 ends 90 min before an 11:00 block: free");
const tight = { bufferBeforeMin: 0, bufferAfterMin: 60, busy: [{ startTime: "2026-10-28T13:30:00Z", endTime: "2026-10-28T14:30:00Z" }] };
slots = suggestSlots(host, { ...args, busy: [], attendeeBusy: [tight] });
assert.equal(slots[0].startUtc, "2026-10-28T14:30:00.000Z", "a 9:30 block with 60 after: 9:00-9:30 is too close, so it starts at 10:30 (busy end + 0 before)");

console.log("all checks passed");
