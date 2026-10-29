import type { Metadata } from "next";
import CrmLauncher from "@/components/crm/CrmLauncher";
import { CRM_LAUNCHER } from "@/components/crm/crmContent";

export const metadata: Metadata = { title: CRM_LAUNCHER.metaTitle, robots: { index: false } };

/** The page the Zoho CRM "Meeting Desk" tab (a Widget with external hosting) points at. Public: it shows nothing from this app. */
export default function CrmWidgetPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-ground px-4 py-8">
      <CrmLauncher />
    </main>
  );
}
