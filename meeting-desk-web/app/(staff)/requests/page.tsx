import type { Metadata } from "next";
import NewRequestPanel from "@/components/requests/NewRequestPanel";
import RequestsSidebar from "@/components/requests/RequestsSidebar";
import { REQUESTS_PAGE } from "@/components/requests/requestsContent";
import { getDraft, listRequests } from "@/lib/data";
import { PAGE_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: REQUESTS_PAGE.metaTitle };

// Phase 1: preview host is Lior. Later: the signed-in host.
const PREVIEW_HOST_ID = "stf_lior";

/** Wireframe 1 — the page only fetches data and composes sections. */
export default async function RequestsPage() {
  const [requests, draft] = await Promise.all([listRequests({ hostId: PREVIEW_HOST_ID }), getDraft(PREVIEW_HOST_ID)]);

  return (
    <div className={PAGE_BODY}>
      <RequestsSidebar requests={requests} draft={draft} />
      <NewRequestPanel hostId={PREVIEW_HOST_ID} />
    </div>
  );
}
