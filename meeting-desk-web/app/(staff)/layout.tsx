import AppHeader from "@/components/layout/AppHeader";
import { getPreviewRole } from "@/lib/preview-role";

/** Staff area shell: header + page. Public booking pages live in app/(public) without this header. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const role = await getPreviewRole();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader role={role} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
