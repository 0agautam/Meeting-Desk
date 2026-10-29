import NewRequestForm from "@/components/requests/NewRequestForm";
import { NEW_REQUEST_FORM } from "./requestsContent";
import { loadCrmUsersForForm } from "@/lib/crm/users";
import { listStaff } from "@/lib/data";
import { PAGE_LEDE, PAGE_TITLE, PANEL } from "@/lib/ui/classes";

/** Right panel of wireframe 1: fetches the staff roster, the form itself is a client component. */
export default async function NewRequestPanel({ userId, hostId, selectableHostIds }: { userId: string; hostId: string; selectableHostIds: string[] }) {
  const staff = await listStaff();
  const crm = await loadCrmUsersForForm(userId);

  return (
    <section className={`${PANEL} lg:min-h-0 lg:overflow-y-auto`} aria-labelledby="new-request-title">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
      <div>
        <h1 id="new-request-title" className={PAGE_TITLE}>
          {NEW_REQUEST_FORM.title}
        </h1>
        <p className={PAGE_LEDE}>{NEW_REQUEST_FORM.lede}</p>
      </div>
      <NewRequestForm
        staff={staff}
        defaultHostId={hostId}
        selectableHostIds={selectableHostIds}
        crmUsers={crm.users}
        crmUsersIssue={crm.issue}
        crmUsersDetail={crm.detail}
      />
      </div>
    </section>
  );
}
