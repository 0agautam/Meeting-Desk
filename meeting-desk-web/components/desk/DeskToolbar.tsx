import Link from "next/link";
import { CHIP, CHIP_ACTIVE, FIELD_INPUT } from "@/lib/ui/classes";
import type { MeetingRequest, Staff } from "@/lib/types";
import { DESK_PAGE, deskQuery } from "./deskContent";
import HostFilter from "./HostFilter";

/** Top bar of the desk: status chips, Host filter and search, all real filters via the address (?status=&host=&q=). */
export default function DeskToolbar({
  requests,
  staff,
  status,
  q,
  host,
}: {
  requests: MeetingRequest[];
  staff: Staff[];
  status: string;
  q: string;
  host: string;
}) {
  const count = (key: string) => (key === "all" ? requests.length : requests.filter((r) => r.status === key).length);
  const hosts = staff.filter((s) => s.roles.includes("host")).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 px-6 py-3 max-lg:px-4">
      {DESK_PAGE.filters.map((f) => (
        <Link key={f.key} href={`/desk${deskQuery({ status: f.key, q, host })}`} className={f.key === status ? CHIP_ACTIVE : CHIP}>
          {f.label} {count(f.key)}
        </Link>
      ))}
      <div className="flex-1" />
      {/* The shared field classes carry w-full, so the widths live on these wrappers. */}
      <form action="/desk" className="flex gap-2 max-sm:w-full max-sm:flex-col">
        <input type="hidden" name="status" value={status} />
        <div className="w-[180px] max-sm:w-full">
          <HostFilter hosts={hosts} value={host} />
        </div>
        <div className="w-[260px] max-sm:w-full">
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label={DESK_PAGE.searchLabel}
            placeholder={DESK_PAGE.searchPlaceholder}
            className={`${FIELD_INPUT} bg-card`}
          />
        </div>
      </form>
    </div>
  );
}
