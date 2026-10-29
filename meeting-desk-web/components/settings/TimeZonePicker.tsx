"use client";

import { useMemo, useState } from "react";
import { listTimeZones, timeZoneLabel } from "@/lib/org/hours";
import { FIELD_INPUT, META } from "@/lib/ui/classes";
import { ORG_HOURS } from "./orgHoursContent";

/** A searchable list of every time zone. Submits the chosen IANA name as the `timezone` field. */
export default function TimeZonePicker({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Only built when the list is opened, so the offsets (which depend on today's date) never differ between the server and the browser.
  const options = useMemo(() => (open ? listTimeZones().map((zone) => ({ zone, label: timeZoneLabel(zone) })) : []), [open]);
  const needle = query.trim().toLowerCase().replace(/ /g, "_");
  const matches = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

  return (
    <div className="relative max-w-sm" onBlur={(e) => (e.currentTarget.contains(e.relatedTarget) ? undefined : setOpen(false))}>
      <input type="hidden" name="timezone" value={value} />
      <input
        id="orgTimezone"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="orgTimezoneList"
        autoComplete="off"
        className={FIELD_INPUT}
        placeholder={ORG_HOURS.timezoneSearch}
        value={open ? query : value ? timeZoneLabel(value) : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches[0]) {
              setValue(matches[0].zone);
              setOpen(false);
            }
          }
        }}
      />
      {open ? (
        <ul id="orgTimezoneList" role="listbox" className="absolute left-0 right-0 top-full z-20 m-0 mt-1 max-h-64 list-none overflow-y-auto rounded-card border border-line bg-card p-1 shadow-lg">
          {matches.length === 0 ? (
            <li className={`${META} px-3 py-2`}>{ORG_HOURS.timezoneNone}</li>
          ) : (
            matches.slice(0, 80).map((o) => (
              <li key={o.zone} role="option" aria-selected={o.zone === value}>
                <button
                  type="button"
                  className={`flex min-h-11 w-full items-center rounded-field px-3 py-1 text-left text-sm hover:bg-accent-soft ${o.zone === value ? "bg-accent-soft font-semibold text-ink" : "text-ink"}`}
                  onClick={() => {
                    setValue(o.zone);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
