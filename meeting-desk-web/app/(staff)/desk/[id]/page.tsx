import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DeskDetailPanel from "@/components/desk/DeskDetailPanel";
import DeskQueue from "@/components/desk/DeskQueue";
import DeskToolbar from "@/components/desk/DeskToolbar";
import { DESK_PAGE, filterDeskRequests } from "@/components/desk/deskContent";
import { getRequest, listEvents, listRequests, listStaff } from "@/lib/data";
import { PAGE_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: DESK_PAGE.metaTitle };

/** Wireframe 3 (one request open). */
export default async function DeskDetailPage({ params, searchParams }: PageProps<"/desk/[id]">) {
  const { id } = await params;
  const { status = "all", q = "" } = await searchParams;
  const [request, requests, staff] = await Promise.all([getRequest(id), listRequests(), listStaff()]);
  if (!request) notFound();

  const events = await listEvents(id);
  const filtered = filterDeskRequests(requests, staff, { status: String(status), q: String(q) });

  return (
    <>
      <DeskToolbar requests={requests} status={String(status)} q={String(q)} />
      <div className={PAGE_BODY}>
        <DeskQueue requests={filtered} staff={staff} activeId={id} />
        <DeskDetailPanel request={request} events={events} staff={staff} />
      </div>
    </>
  );
}
