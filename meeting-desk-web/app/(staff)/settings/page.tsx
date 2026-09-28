import type { Metadata } from "next";
import TeamTable from "@/components/settings/TeamTable";
import { SETTINGS_PAGE } from "@/components/settings/settingsContent";
import { listStaff } from "@/lib/data";
import { PAGE_BODY } from "@/lib/ui/classes";

export const metadata: Metadata = { title: SETTINGS_PAGE.metaTitle };

/** Wireframe 4. */
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { edit, add } = await searchParams;
  const staff = await listStaff();
  return (
    <div className={PAGE_BODY}>
      <TeamTable staff={staff} editId={typeof edit === "string" ? edit : undefined} showAdd={add === "1"} />
    </div>
  );
}
