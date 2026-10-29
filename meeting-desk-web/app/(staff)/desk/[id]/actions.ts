"use server";

import { revalidatePath } from "next/cache";
import { busyForPeople, calendarPeople, withoutCalendar } from "@/lib/booking/availability";
import { readSchedulingNotes } from "@/lib/ai/notesReader";
import { EMPTY_CONSTRAINTS, describeConstraints, hasTimingConstraints, parseConstraints } from "@/lib/booking/constraints";
import { placeHolds, releaseHolds, stripHolds } from "@/lib/booking/holds";
import { listAvailableDays, localDayOf, suggestSlots, type PersonBusy } from "@/lib/booking/slots";
import { requireRole } from "@/lib/auth/current-user";
import { buildAvailabilityQuestion, buildEmailDraft } from "@/components/desk/deskContent";
import { addEvent, getRequest, listBookings, listStaff, setConstraints, setEmailDraft, setOfferedSlots, setRequestStatus } from "@/lib/data";
import { getBaseUrl } from "@/lib/http/baseUrl";
import type { EmailDraft, Staff } from "@/lib/types";


/** "Copy email" — called directly from the client (clipboard write happens there); just logs it. */
export async function logEmailCopied(requestId: string) {
  const user = await requireRole("coordinator");
  const request = await getRequest(requestId);
  if (!request) return;
  await addEvent({ requestId, type: "email_copied", actorId: user.id, version: request.version });
  revalidatePath(`/desk/${requestId}`);
}

/** error: nothing was offered. notice: times were offered, but the coordinator should know something (e.g. the notes couldn't be read). */
export type GenerateEmailState = { error: string; askMessage?: string } | { notice: string; askMessage?: string } | null;

const SUGGEST_WINDOW_DAYS = 14;

/**
 * "Generate email" — reads the real calendars of the host and of every invited ABR team member (each must
 * have one connected, or nothing is offered), picks times that are free for all of them for this request's duration, and saves them on the
 * request so the email and, later, the client's booking page show exactly these times.
 * Running it again recomputes from the current calendar.
 */
export async function generateEmail(_previous: GenerateEmailState, formData: FormData): Promise<GenerateEmailState> {
  const user = await requireRole("coordinator");
  return runGenerate(user, String(formData.get("requestId") ?? ""));
}

async function runGenerate(user: Staff, requestId: string, opts: { rereadNotes?: boolean } = {}): Promise<GenerateEmailState> {
  const request = await getRequest(requestId);
  if (!request) return { error: "This request no longer exists." };
  if (request.status !== "new" && request.status !== "updated") return { error: "This request isn't waiting on you." };

  const staff = await listStaff();
  const host = staff.find((s) => s.id === request.hostId);
  if (!host) return { error: "The host for this request isn't in the team list any more." };

  // The times offered follow the organisation's business hours, which an admin sets in Settings (or copies from the CRM).
  if (host.workingHours.days.length === 0) {
    return { error: "The organisation's time zone and business hours aren't set yet, so no times can be offered. An admin can connect the Zoho CRM or set them in Settings." };
  }

  // Everyone joining must have a calendar we can read, or a time could be offered that clashes for them.
  const { people, checked, outside } = calendarPeople(request, host, staff);
  if (outside.length > 0) {
    return { error: `${outside.map((a) => a.name).join(", ")} ${outside.length === 1 ? "isn't" : "aren't"} on the Meeting Desk team, so their calendar can't be reached. Add them in Settings, or take them off this request.` };
  }
  const missing = await withoutCalendar(people);
  if (missing.length > 0) {
    return { error: `${missing.map((p) => p.name).join(", ")} ${missing.length === 1 ? "hasn't" : "haven't"} connected a calendar (or it needs reconnecting), so there are no real times to offer. Ask ${missing.length === 1 ? "them" : "each of them"} to connect it in My settings.` };
  }

  // What the notes say about timing: read by the AI the first time (or when asked again), saved on the request so the
  // coordinator can correct it, and applied below. If the AI can't be reached the times are still offered, without it.
  let constraints = opts.rereadNotes ? undefined : request.constraints;
  let notice: string | undefined;
  if (!constraints) {
    const read = await readSchedulingNotes({ subject: request.subject, notes: request.notes, timeZone: host.timezone });
    if (read) {
      constraints = read;
      await setConstraints(requestId, read);
    } else {
      constraints = EMPTY_CONSTRAINTS;
      notice = "The AI couldn't read the notes just now, so these times don't follow them. Read the notes yourself, or try again.";
    }
  }

  // Only the host's and the required attendees' calendars decide the times; optional attendees just get the hold and the invite.
  // A far-off earliest date widens the window.
  const now = new Date();
  const daysToEarliest = constraints.earliestDate ? Math.max(0, Math.ceil((Date.parse(`${constraints.earliestDate}T00:00:00Z`) - now.getTime()) / 86_400_000)) : 0;
  const windowDays = Math.min(45, SUGGEST_WINDOW_DAYS + Math.ceil((daysToEarliest * 5) / 7));
  const windowEnd = new Date(now.getTime() + (windowDays * 2 + 2) * 86_400_000);

  let busy: PersonBusy[];
  try {
    // The request's own earlier holds are on the calendars too; they mustn't block its own times.
    busy = await busyForPeople(checked, { startUtc: now.toISOString(), endUtc: windowEnd.toISOString() }, request);
  } catch (err) {
    console.warn("generateEmail: couldn't read calendar availability:", err);
    return { error: `Couldn't read everyone's calendar just now, so no times were offered. Try again in a moment.` };
  }

  const slots = suggestSlots(host, {
    durationMin: request.durationMin,
    busy: busy[0].busy,
    attendeeBusy: busy.slice(1),
    bookings: await listBookings(host.id),
    windowDays,
    constraints,
  });
  // If what the notes asked for can't be met, the coordinator is told and gets a ready-made question to the host.
  const names = checked.map((p) => p.name);
  const wanted = hasTimingConstraints(constraints) ? describeConstraints(constraints) : [];
  const question = (problem: "none" | "few" | "today" | "soon") => buildAvailabilityQuestion({ durationMin: request.durationMin, names, wanted, problem });
  if (slots.length === 0) {
    const fit = wanted.length ? ` that fit the notes (${wanted.join(", ")}). Adjust what was understood above and try again, or ask ${host.name} for other times` : "";
    return {
      error: `No ${request.durationMin}-minute time is free for everyone${fit || ` in the next ${windowDays} working days. Ask ${host.name} for other times`}.`,
      askMessage: question("none"),
    };
  }
  let askMessage: string | undefined;
  if (constraints.urgency !== "normal") {
    // The host's notes asked for it soon: say so if the first offer is later than that.
    const firstWantedDay = listAvailableDays(host, 1, { urgency: constraints.urgency, now })[0];
    if (localDayOf(slots[0].startUtc, host.timezone) !== firstWantedDay) {
      const when = constraints.urgency === "today" ? "today" : "on the next working day";
      notice = `${notice ? `${notice} ` : ""}The notes ask for a meeting ${when}, but nothing is free then for everyone, so the times offered are later.`;
      askMessage = question(constraints.urgency);
    }
  } else if (slots.length < 2) {
    notice = `${notice ? `${notice} ` : ""}Only 1 time is free for everyone in the next ${windowDays} working days (two are usually offered).`;
    askMessage = question("few");
  }

  // Swap the old grey holds for new ones on the host's and the invited team members' calendars. If the new ones can't be placed the old ones are
  // already gone, so the request goes back to "no times yet" rather than pointing at holds that don't exist.
  await releaseHolds(host.id, request.offeredSlots);
  let held: typeof slots;
  try {
    held = await placeHolds(host, people.slice(1), request, slots);
  } catch (err) {
    console.warn("generateEmail: couldn't place tentative holds:", err);
    await setOfferedSlots(requestId, []);
    await setEmailDraft(requestId, null);
    revalidatePath(`/desk/${requestId}`);
    return { error: `Couldn't put the tentative holds on everyone's calendar just now, so no times were offered. Try again in a moment.` };
  }

  await setOfferedSlots(requestId, held);
  // Write the email around those times and save it, so the coordinator can edit it (and still see it after it is sent).
  await setEmailDraft(requestId, {
    subject: request.subject,
    to: request.to,
    cc: request.cc,
    body: buildEmailDraft({
      clientEmail: request.to[0],
      hostName: host.name,
      subject: request.subject,
      durationMin: request.durationMin,
      coordinatorName: user.name,
      slots: held,
      timeZone: host.timezone,
      bookingUrl: `${await getBaseUrl()}/book/${host.slug}/${request.id}`,
    }),
  });
  revalidatePath(`/desk/${requestId}`);
  return notice ? { notice, askMessage } : null;
}

/**
 * The coordinator's corrections to "What I understood from the notes". intent: "save" just saves; "regenerate" saves and
 * offers new times (and a new email) that follow it; "reread" asks the AI to read the notes again and regenerates.
 */
export async function saveConstraints(_previous: GenerateEmailState, formData: FormData): Promise<GenerateEmailState> {
  const user = await requireRole("coordinator");
  const requestId = String(formData.get("requestId") ?? "");
  const request = await getRequest(requestId);
  if (!request) return { error: "This request no longer exists." };
  if (request.status !== "new" && request.status !== "updated") return { error: "This request isn't waiting on you." };

  const intent = String(formData.get("intent") ?? "save");
  if (intent === "reread") return runGenerate(user, requestId, { rereadNotes: true });

  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  await setConstraints(
    requestId,
    parseConstraints({
      earliestDate: text("earliestDate"),
      latestDate: text("latestDate"),
      avoidWeekdays: formData.getAll("avoid"),
      timeOfDay: formData.get("timeOfDay"),
      notBeforeTime: text("notBeforeTime"),
      notAfterTime: text("notAfterTime"),
      urgency: formData.get("urgency"),
      other: formData.get("other"),
    }),
  );
  if (intent === "regenerate") return runGenerate(user, requestId);
  revalidatePath(`/desk/${requestId}`);
  return null;
}

/** "Release holds": takes the grey tentative events off the host's calendar (e.g. after booking the meeting another way). The offered times stay on the request. */
export async function releaseRequestHolds(formData: FormData) {
  await requireRole("coordinator");
  const requestId = String(formData.get("requestId") ?? "");
  const request = await getRequest(requestId);
  if (!request || !request.offeredSlots.some((s) => s.holdEventId)) return;
  await releaseHolds(request.hostId, request.offeredSlots);
  await setOfferedSlots(requestId, stripHolds(request.offeredSlots));
  revalidatePath(`/desk/${requestId}`);
}

export type SaveEmailState = { ok: true } | { error: string } | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DRAFT_JSON = 9500; // the Data Store text column holds 10,000 characters

function parseAddresses(value: FormDataEntryValue | null): string[] | null {
  const list = String(value ?? "")
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
  return list.every((v) => EMAIL_PATTERN.test(v)) ? list : null;
}

/** "Save changes" on the email: subject, recipients and wording. Allowed at any status, including after it was sent. */
export async function saveEmailDraft(_previous: SaveEmailState, formData: FormData): Promise<SaveEmailState> {
  const user = await requireRole("coordinator");
  const requestId = String(formData.get("requestId") ?? "");
  const request = await getRequest(requestId);
  if (!request) return { error: "This request no longer exists." };

  const to = parseAddresses(formData.get("to"));
  const cc = parseAddresses(formData.get("cc"));
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  if (!to || !cc) return { error: "Check the To and Cc addresses: separate them with commas and use full email addresses." };
  if (!subject || !body) return { error: "The subject and the email text can't be empty." };

  const draft: EmailDraft = { subject, body, to, cc };
  if (JSON.stringify(draft).length > MAX_DRAFT_JSON) return { error: "The email is too long to save. Shorten it a little." };

  await setEmailDraft(requestId, draft);
  await addEvent({ requestId, type: "email_edited", actorId: user.id, version: request.version });
  revalidatePath(`/desk/${requestId}`);
  return { ok: true };
}

/** "Mark as sent" — moves the request to email_sent, waiting on the client. Needs generated times first. */
export async function markAsSent(formData: FormData) {
  const user = await requireRole("coordinator");
  const requestId = String(formData.get("requestId") ?? "");
  const request = await getRequest(requestId);
  if (!request || request.offeredSlots.length === 0) return;
  await setRequestStatus(requestId, "email_sent");
  await addEvent({ requestId, type: "marked_sent", actorId: user.id, version: request.version });
  revalidatePath("/desk");
  revalidatePath(`/desk/${requestId}`);
}

/** "Ask {host} for info" — moves the request back to needs_info with the coordinator's question. */
export async function askForInfo(formData: FormData) {
  const user = await requireRole("coordinator");
  const requestId = String(formData.get("requestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const request = await getRequest(requestId);
  if (!request || !message) return;
  await setRequestStatus(requestId, "needs_info");
  await addEvent({ requestId, type: "info_requested", actorId: user.id, message, version: request.version });
  revalidatePath("/desk");
  revalidatePath(`/desk/${requestId}`);
}
