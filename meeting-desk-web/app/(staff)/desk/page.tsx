import type { Metadata } from "next";
import DeskDetailPanel from "@/components/desk/DeskDetailPanel";
import DeskQueue from "@/components/desk/DeskQueue";
import DeskToolbar from "@/components/desk/DeskToolbar";
import { DESK_PAGE, filterDeskRequests } from "@/components/desk/deskContent";
import { listRequests, listStaff } from "@/lib/data";
import { PAGE_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: DESK_PAGE.metaTitle };

/** Wireframe 3 (queue, nothing selected). */
export default async function DeskPage({ searchParams }: PageProps<"/desk">) {
  const { status = "all", q = "" } = await searchParams;
  const [requests, staff] = await Promise.all([listRequests(), listStaff()]);
  const filtered = filterDeskRequests(requests, staff, { status: String(status), q: String(q) });

  return (
    <>
      <DeskToolbar requests={requests} status={String(status)} q={String(q)} />
      <div className={PAGE_BODY}>
        <DeskQueue requests={filtered} staff={staff} />
        <DeskDetailPanel events={[]} staff={staff} />
      </div>
    </>
  );
}
