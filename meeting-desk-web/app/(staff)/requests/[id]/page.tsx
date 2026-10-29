import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RequestHistoryPanel from "@/components/requests/RequestHistoryPanel";
import RequestsSidebar from "@/components/requests/RequestsSidebar";
import { REQUEST_DETAIL, parseStatusFilter } from "@/components/requests/requestsContent";
import { requireRole } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/permissions";
import { getRequest, listEvents, listRequests } from "@/lib/data";
import { APP_SHELL, SHELL_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: REQUEST_DETAIL.metaTitle };

/** Wireframe 2. A host can only open their own requests (anyone else's looks like "not found"). Next 16: `params` is a Promise. */
export default async function RequestDetailPage({ params, searchParams }: PageProps<"/requests/[id]">) {
  const user = await requireRole("host");
  const { id } = await params;
  const { status } = await searchParams;
  const request = await getRequest(id);
  if (!request || (!isAdmin(user) && request.hostId !== user.id)) notFound();

  const [requests, events] = await Promise.all([
    listRequests(isAdmin(user) ? {} : { hostId: user.id }),
    listEvents(id),
  ]);

  return (
    <div className={APP_SHELL}>
      <div className={`${SHELL_BODY} pt-5`}>
        <RequestsSidebar requests={requests} currentRequestId={request.id} status={parseStatusFilter(status)} />
        <RequestHistoryPanel request={request} events={events} userId={user.id} />
      </div>
    </div>
  );
}
