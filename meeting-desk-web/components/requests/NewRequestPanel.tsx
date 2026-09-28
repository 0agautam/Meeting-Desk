import NewRequestForm from "@/components/requests/NewRequestForm";
import { NEW_REQUEST_FORM } from "./requestsContent";
import { listStaff } from "@/lib/data";
import { PAGE_LEDE, PAGE_TITLE, PANEL } from "@/lib/ui/classes";

/** Right panel of wireframe 1: fetches the staff roster, the form itself is a client component. */
export default async function NewRequestPanel({ hostId }: { hostId: string }) {
  const staff = await listStaff();

  return (
    <section className={`${PANEL} flex flex-col gap-4`} aria-labelledby="new-request-title">
      <div>
        <h1 id="new-request-title" className={PAGE_TITLE}>
          {NEW_REQUEST_FORM.title}
        </h1>
        <p className={PAGE_LEDE}>{NEW_REQUEST_FORM.lede}</p>
      </div>
      <NewRequestForm staff={staff} defaultHostId={hostId} />
    </section>
  );
}
