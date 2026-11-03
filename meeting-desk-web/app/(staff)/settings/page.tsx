import type { Metadata } from "next";
import { ORG_CRM } from "@/components/settings/orgCrmContent";
import { ORG_HOURS } from "@/components/settings/orgHoursContent";
import OrganisationCrm from "@/components/settings/OrganisationCrm";
import OrganisationHours from "@/components/settings/OrganisationHours";
import { getSavedOrgSettings } from "@/lib/org/settings";
import TeamTable from "@/components/settings/TeamTable";
import { listCalendarStatuses } from "@/lib/calendar/accountStore";
import { ORGANISATION_CRM_ID, getCrmAccount } from "@/lib/crm/accountStore";
import { SETTINGS_PAGE } from "@/components/settings/settingsContent";
import { requireRole } from "@/lib/auth/current-user";
import { countHostData, listStaff } from "@/lib/data";
import { PAGE_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: SETTINGS_PAGE.metaTitle };

/** Wireframe 4. Admin only. */
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireRole("admin");
  const { edit, add, error, crm, hours } = await searchParams;
  const [staff, crmAccount, savedOrg, calendars] = await Promise.all([
    listStaff(),
    getCrmAccount(ORGANISATION_CRM_ID),
    getSavedOrgSettings(),
    listCalendarStatuses(),
  ]);
  const crmMessage = typeof crm === "string" ? ORG_CRM.messages[crm] : undefined;
  const hoursMessage = typeof hours === "string" ? ORG_HOURS.messages[hours] : undefined;
  const editId = typeof edit === "string" ? edit : undefined;
  // Only counted for the person being edited, and only if they exist (the id comes from the address).
  const editData = editId && staff.some((s) => s.id === editId) ? await countHostData(editId) : { requests: 0, bookings: 0 };
  return (
    <div className={`${PAGE_BODY} flex-col`}>
      <TeamTable
        staff={staff}
        calendars={calendars}
        currentUserId={user.id}
        editId={editId}
        editData={editData}
        showAdd={add === "1"}
        error={typeof error === "string" ? error : undefined}
      />
      <div className="grid grid-cols-2 items-start gap-6 max-lg:grid-cols-1">
        <OrganisationCrm account={crmAccount} message={crmMessage} />
        <OrganisationHours timezone={savedOrg.timezone} hours={savedOrg.hours} message={hoursMessage} />
      </div>
    </div>
  );
}
