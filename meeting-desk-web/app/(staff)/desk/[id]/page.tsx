import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DeskDetailPanel from "@/components/desk/DeskDetailPanel";
import DeskQueue from "@/components/desk/DeskQueue";
import DeskToolbar from "@/components/desk/DeskToolbar";
import { DESK_PAGE, deskQuery, filterDeskRequests } from "@/components/desk/deskContent";
import { requireRole } from "@/lib/auth/current-user";
import { getRequest, listEvents, listRequests, listStaff } from "@/lib/data";
import { APP_SHELL, SHELL_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: DESK_PAGE.metaTitle };

/** Wireframe 3 (one request open). */
export default async function DeskDetailPage({ params, searchParams }: PageProps<"/desk/[id]">) {
  const user = await requireRole("coordinator");
  const { id } = await params;
  const { status = "all", q = "", host = "" } = await searchParams;
  const [request, requests, staff] = await Promise.all([getRequest(id), listRequests(), listStaff()]);
  if (!request) notFound();

  const events = await listEvents(id);
  const filtered = filterDeskRequests(requests, staff, { status: String(status), q: String(q), host: String(host) });

  return (
    <div className={APP_SHELL}>
      <DeskToolbar requests={requests} staff={staff} status={String(status)} q={String(q)} host={String(host)} />
      <div className={SHELL_BODY}>
        <DeskQueue requests={filtered} staff={staff} activeId={id} query={deskQuery({ status: String(status), q: String(q), host: String(host) })} />
        <DeskDetailPanel request={request} events={events} staff={staff} coordinatorName={user.name} />
      </div>
    </div>
  );
}
