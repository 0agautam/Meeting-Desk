import type { Metadata } from "next";
import NewRequestPanel from "@/components/requests/NewRequestPanel";
import RequestsSidebar from "@/components/requests/RequestsSidebar";
import { REQUESTS_PAGE } from "@/components/requests/requestsContent";
import { requireRole } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/permissions";
import { getDraft, listRequests, listStaff } from "@/lib/data";
import { parseStatusFilter } from "@/components/requests/requestsContent";
import { APP_SHELL, SHELL_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: REQUESTS_PAGE.metaTitle };

/** Wireframe 1. A host sees only their own requests; an admin sees all and can request on behalf of any host. */
export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const user = await requireRole("host");
  const { status } = await searchParams;
  const hosts = (await listStaff()).filter((s) => s.roles.includes("host"));

  const seeAll = isAdmin(user);
  const defaultHostId = user.roles.includes("host") ? user.id : (hosts[0]?.id ?? "");
  const selectableHostIds = seeAll ? hosts.map((h) => h.id) : [user.id];

  const [requests, draft] = await Promise.all([
    listRequests(seeAll ? {} : { hostId: user.id }),
    getDraft(defaultHostId),
  ]);

  return (
    <div className={APP_SHELL}>
      <div className={`${SHELL_BODY} pt-5`}>
        <RequestsSidebar requests={requests} draft={draft} status={parseStatusFilter(status)} />
        <NewRequestPanel userId={user.id} hostId={defaultHostId} selectableHostIds={selectableHostIds} />
      </div>
    </div>
  );
}
