import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RequestHistoryPanel from "@/components/requests/RequestHistoryPanel";
import RequestsSidebar from "@/components/requests/RequestsSidebar";
import { REQUEST_DETAIL } from "@/components/requests/requestsContent";
import { getRequest, listEvents, listRequests } from "@/lib/data";
import { PAGE_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: REQUEST_DETAIL.metaTitle };

/** Wireframe 2. Next 16: `params` is a Promise — always await it. */
export default async function RequestDetailPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  const [requests, events] = await Promise.all([listRequests({ hostId: request.hostId }), listEvents(id)]);

  return (
    <div className={PAGE_BODY}>
      <RequestsSidebar requests={requests} currentRequestId={request.id} />
      <RequestHistoryPanel request={request} events={events} />
    </div>
  );
}
