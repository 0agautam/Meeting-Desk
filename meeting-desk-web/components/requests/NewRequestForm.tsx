"use client";

import { useMemo, useState } from "react";
import { saveRequestDraft, submitRequest, submitRequestAndStartAnother } from "@/app/(staff)/requests/actions";
import type { Staff } from "@/lib/types";
import {
  BTN,
  BTN_GHOST,
  BTN_PRIMARY,
  CHIP,
  CHIP_ACCENT,
  CHIP_ACTIVE,
  CHIP_DASHED,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_SELECT,
  FIELD_TEXTAREA,
  META,
} from "@/lib/ui/classes";
import { DEFAULT_DURATION_MIN, DURATION_OPTIONS, MOCK_CRM_DIRECTORY, NEW_REQUEST_FORM } from "./requestsContent";

type Contact = { name: string; email: string };
type AttendeeState = { staffId: string; required: boolean };

function findCrmMatch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return MOCK_CRM_DIRECTORY.find((d) => d.domain.toLowerCase().includes(q) || d.company.toLowerCase().includes(q));
}

/** Wireframe 1's form. Client component: chips, duration and the CRM-search demo need local state. */
export default function NewRequestForm({ staff, defaultHostId }: { staff: Staff[]; defaultHostId: string }) {
  const hosts = staff.filter((s) => s.role === "host");
  const [hostId, setHostId] = useState(defaultHostId);
  const [clientQuery, setClientQuery] = useState("");
  const [to, setTo] = useState<Contact[]>([]);
  const [cc, setCc] = useState<Contact[]>([]);
  const [attendees, setAttendees] = useState<AttendeeState[]>([]);
  const [durationMin, setDurationMin] = useState<number>(DEFAULT_DURATION_MIN);

  const host = staff.find((s) => s.id === hostId);
  const crmMatch = useMemo(() => findCrmMatch(clientQuery), [clientQuery]);
  const addedEmails = useMemo(() => new Set([...to, ...cc].map((c) => c.email)), [to, cc]);
  const nextContact = crmMatch?.contacts.find((c) => !addedEmails.has(c.email));
  const attendeeCandidates = staff.filter((s) => s.id !== hostId && !attendees.some((a) => a.staffId === s.id));

  function addFromCrm() {
    if (!nextContact) return;
    if (to.length === 0) setTo((prev) => [...prev, nextContact]);
    else setCc((prev) => [...prev, nextContact]);
  }

  function addPerson() {
    const next = attendeeCandidates[0];
    if (!next) return;
    setAttendees((prev) => [...prev, { staffId: next.id, required: true }]);
  }

  /** Click cycles required → optional → removed (wireframe 1 shows no separate remove control for these chips). */
  function cycleAttendee(staffId: string) {
    setAttendees((prev) => {
      const current = prev.find((a) => a.staffId === staffId);
      if (current?.required) return prev.map((a) => (a.staffId === staffId ? { ...a, required: false } : a));
      return prev.filter((a) => a.staffId !== staffId);
    });
  }

  function onHostChange(nextHostId: string) {
    setHostId(nextHostId);
    setAttendees((prev) => prev.filter((a) => a.staffId !== nextHostId));
  }

  return (
    <form action={submitRequest} className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div>
          <label className={FIELD_LABEL} htmlFor="hostId">
            {NEW_REQUEST_FORM.hostLabel}
          </label>
          <select
            id="hostId"
            name="hostId"
            className={FIELD_SELECT}
            value={hostId}
            onChange={(e) => onHostChange(e.target.value)}
          >
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="subject">
            {NEW_REQUEST_FORM.subjectLabel}
          </label>
          <input
            id="subject"
            name="subject"
            required
            className={FIELD_INPUT}
            placeholder={NEW_REQUEST_FORM.subjectPlaceholder}
          />
        </div>
      </div>

      <div>
        <label className={FIELD_LABEL} htmlFor="clientQuery">
          {NEW_REQUEST_FORM.clientLabel}
        </label>
        <input
          id="clientQuery"
          className={FIELD_INPUT}
          placeholder={NEW_REQUEST_FORM.clientPlaceholder}
          value={clientQuery}
          onChange={(e) => setClientQuery(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {clientQuery.trim() ? (
            <span className={META}>
              {crmMatch ? `${crmMatch.company} · ${crmMatch.contacts.length} contacts found` : NEW_REQUEST_FORM.noMatch}
            </span>
          ) : null}
          {to.map((c) => (
            <span key={c.email} className={CHIP}>
              To: {c.name}
              <button type="button" aria-label={`Remove ${c.name} from To`} onClick={() => setTo((p) => p.filter((x) => x.email !== c.email))}>
                ×
              </button>
            </span>
          ))}
          {cc.map((c) => (
            <span key={c.email} className={CHIP}>
              Cc: {c.name}
              <button type="button" aria-label={`Remove ${c.name} from Cc`} onClick={() => setCc((p) => p.filter((x) => x.email !== c.email))}>
                ×
              </button>
            </span>
          ))}
          {crmMatch && nextContact ? (
            <button type="button" className={CHIP_ACCENT} onClick={addFromCrm}>
              {NEW_REQUEST_FORM.addFromCrm}
            </button>
          ) : null}
        </div>
        {crmMatch ? <input type="hidden" name="crmAccount" value={crmMatch.company} /> : null}
        {to.map((c) => (
          <input key={c.email} type="hidden" name="to" value={c.email} />
        ))}
        {cc.map((c) => (
          <input key={c.email} type="hidden" name="cc" value={c.email} />
        ))}
      </div>

      <div>
        <span className={FIELD_LABEL}>{NEW_REQUEST_FORM.attendeesLabel}</span>
        <div className="flex flex-wrap gap-2">
          {host ? <span className={CHIP}>{host.name} · host</span> : null}
          {attendees.map((a) => {
            const person = staff.find((s) => s.id === a.staffId);
            if (!person) return null;
            return (
              <button
                key={a.staffId}
                type="button"
                className={a.required ? CHIP : CHIP_DASHED}
                onClick={() => cycleAttendee(a.staffId)}
                aria-label={`${person.name}, ${a.required ? "required" : "optional"} — click to change`}
              >
                {person.name} · {a.required ? "required" : "optional"}
              </button>
            );
          })}
          {attendeeCandidates.length > 0 ? (
            <button type="button" className={CHIP_ACCENT} onClick={addPerson}>
              {NEW_REQUEST_FORM.addPerson}
            </button>
          ) : null}
        </div>
        {attendees
          .filter((a) => a.required)
          .map((a) => (
            <input key={a.staffId} type="hidden" name="requiredAttendee" value={a.staffId} />
          ))}
        {attendees
          .filter((a) => !a.required)
          .map((a) => (
            <input key={a.staffId} type="hidden" name="optionalAttendee" value={a.staffId} />
          ))}
      </div>

      <div>
        <span className={FIELD_LABEL}>{NEW_REQUEST_FORM.durationLabel}</span>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.minutes}
              type="button"
              className={d.minutes === durationMin ? CHIP_ACTIVE : CHIP}
              onClick={() => setDurationMin(d.minutes)}
              aria-pressed={d.minutes === durationMin}
            >
              {d.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="durationMin" value={durationMin} />
      </div>

      <div className="flex flex-1 flex-col">
        <label className={FIELD_LABEL} htmlFor="notes">
          {NEW_REQUEST_FORM.notesLabel}
        </label>
        <textarea id="notes" name="notes" className={FIELD_TEXTAREA} placeholder={NEW_REQUEST_FORM.notesPlaceholder} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={BTN_PRIMARY}>
          {NEW_REQUEST_FORM.submit}
        </button>
        <button type="submit" formAction={submitRequestAndStartAnother} className={BTN}>
          {NEW_REQUEST_FORM.submitAndAnother}
        </button>
        <button type="submit" formAction={saveRequestDraft} className={BTN_GHOST}>
          {NEW_REQUEST_FORM.saveDraft}
        </button>
      </div>
    </form>
  );
}
