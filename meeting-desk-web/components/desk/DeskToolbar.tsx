import Link from "next/link";
import { CHIP, CHIP_ACTIVE, FIELD_INPUT } from "@/lib/ui/classes";
import type { MeetingRequest } from "@/lib/types";
import { DESK_PAGE } from "./deskContent";

/** Status filter chips + search (wireframe 3). Real filtering via searchParams (?status=&q=). */
export default function DeskToolbar({
  requests,
  status,
  q,
}: {
  requests: MeetingRequest[];
  status: string;
  q: string;
}) {
  const count = (key: string) => (key === "all" ? requests.length : requests.filter((r) => r.status === key).length);
  const href = (key: string) => `/desk?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-2 px-8 pt-4 max-md:px-4">
      {DESK_PAGE.filters.map((f) => (
        <Link key={f.key} href={href(f.key)} className={f.key === status ? CHIP_ACTIVE : CHIP}>
          {f.label} {count(f.key)}
        </Link>
      ))}
      <div className="flex-1" />
      <form action="/desk" className="flex">
        <input type="hidden" name="status" value={status} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label={DESK_PAGE.searchLabel}
          placeholder={DESK_PAGE.searchPlaceholder}
          className={`${FIELD_INPUT} w-[260px] bg-card`}
        />
      </form>
    </div>
  );
}
