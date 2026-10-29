"use client";

import { FIELD_SELECT } from "@/lib/ui/classes";

/** The desk's Host dropdown: picking one applies the filter straight away (it sits in the same form as the search box). */
export default function HostFilter({ hosts, value }: { hosts: { id: string; name: string }[]; value: string }) {
  return (
    <select
      name="host"
      aria-label="Filter by host"
      defaultValue={value}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`${FIELD_SELECT} bg-card`}
    >
      <option value="">All hosts</option>
      {hosts.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </select>
  );
}
