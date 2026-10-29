import Link from "next/link";
import AddPersonPanel from "@/components/settings/AddPersonPanel";
import CopyLinkButton from "@/components/settings/CopyLinkButton";
import EditStaffPanel from "@/components/settings/EditStaffPanel";
import Modal from "@/components/ui/Modal";
import { roleLabel } from "@/lib/auth/permissions";
import type { Staff } from "@/lib/types";
import { BTN_PRIMARY, PAGE_LEDE, PAGE_TITLE, PANEL } from "@/lib/ui/classes";
import { CALENDAR_LABEL, CALENDAR_PILL_CLASS, SETTINGS_PAGE } from "./settingsContent";

/** Wireframe 4: the team table, plus the Edit or Add panel for whichever row is active. */
export default function TeamTable({
  staff,
  currentUserId,
  editId,
  editData,
  showAdd,
  error,
}: {
  staff: Staff[];
  currentUserId: string;
  editId?: string;
  /** What deleting the person being edited would also remove (counted by the page). */
  editData: { requests: number; bookings: number };
  showAdd?: boolean;
  error?: string;
}) {
  const editing = editId ? staff.find((s) => s.id === editId) : undefined;

  return (
    <section className={`${PANEL} flex flex-col gap-4`}>
      <div className="flex items-end justify-between">
        <div>
          <h1 className={PAGE_TITLE}>{SETTINGS_PAGE.title}</h1>
          <p className={PAGE_LEDE}>{SETTINGS_PAGE.lede}</p>
        </div>
        <Link href="/settings?add=1" className={`${BTN_PRIMARY} h-11 px-4 text-sm`}>
          {SETTINGS_PAGE.addPerson}
        </Link>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {SETTINGS_PAGE.columns.map((c) => (
              <th key={c} scope="col" className="px-2 py-2 font-semibold first:pl-0">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-b border-line">
              <td className="px-2 py-3 pl-0">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="text-xs text-muted">{s.email}</div>
              </td>
              <td className="px-2 py-3">{roleLabel(s.roles)}</td>
              <td className="px-2 py-3">
                {s.calendarProvider ? (
                  <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${CALENDAR_PILL_CLASS[s.calendarProvider]}`}>
                    {CALENDAR_LABEL[s.calendarProvider]}
                  </span>
                ) : (
                  <span className="text-muted">–</span>
                )}
              </td>
              <td className="px-2 py-3">{s.roles.includes("host") ? SETTINGS_PAGE.bufferCell(s.bufferBeforeMin, s.bufferAfterMin) : <span className="text-muted">–</span>}</td>
              <td className="px-2 py-3">
                {s.roles.includes("host") ? <Link href={`/book/${s.slug}`}>/book/{s.slug}</Link> : <span className="text-muted">–</span>}
              </td>
              <td className="px-2 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {s.roles.includes("host") ? <CopyLinkButton path={`/book/${s.slug}`} /> : null}
                  <Link
                    href={`/settings?edit=${s.id}`}
                    className="inline-flex h-8 items-center rounded-field border border-field-line bg-card px-3 text-xs font-semibold text-ink hover:bg-ground"
                  >
                    {SETTINGS_PAGE.edit}
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showAdd ? (
        <Modal title={SETTINGS_PAGE.addTitle} closeHref="/settings" closeLabel={SETTINGS_PAGE.close}>
          <AddPersonPanel error={error} />
        </Modal>
      ) : editing ? (
        <Modal title={SETTINGS_PAGE.editTitle(editing.name)} subtitle={editing.email} closeHref="/settings" closeLabel={SETTINGS_PAGE.close}>
          <EditStaffPanel staff={editing} error={error} isSelf={editing.id === currentUserId} data={editData} />
        </Modal>
      ) : null}
    </section>
  );
}
