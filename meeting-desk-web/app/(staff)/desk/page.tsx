import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DeskDetailPanel from "@/components/desk/DeskDetailPanel";
import DeskQueue from "@/components/desk/DeskQueue";
import DeskToolbar from "@/components/desk/DeskToolbar";
import { DESK_PAGE, deskQuery, filterDeskRequests } from "@/components/desk/deskContent";
import { requireRole } from "@/lib/auth/current-user";
import { listRequests, listStaff } from "@/lib/data";
import { APP_SHELL, SHELL_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: DESK_PAGE.metaTitle };

/** Wireframe 3 (queue, nothing selected). */
export default async function DeskPage({ searchParams }: PageProps<"/desk">) {
  await requireRole("coordinator");
  const { status = "all", q = "", host = "" } = await searchParams;
  const [requests, staff] = await Promise.all([listRequests(), listStaff()]);
  const filtered = filterDeskRequests(requests, staff, { status: String(status), q: String(q), host: String(host) });
  const query = deskQuery({ status: String(status), q: String(q), host: String(host) });

  // Land straight in the work: the request that has waited longest on the coordinator (new, or updated by the host).
  const urgent = filtered
    .filter((r) => r.status === "new" || r.status === "updated")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
  if (urgent) redirect(`/desk/${urgent.id}${query}`);

  return (
    <div className={APP_SHELL}>
      <DeskToolbar requests={requests} staff={staff} status={String(status)} q={String(q)} host={String(host)} />
      <div className={SHELL_BODY}>
        <DeskQueue requests={filtered} staff={staff} query={query} />
        <DeskDetailPanel events={[]} staff={staff} />
      </div>
    </div>
  );
}
