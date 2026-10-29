import AppHeader from "@/components/layout/AppHeader";
import { requireUser } from "@/lib/auth/current-user";

/**
 * Staff area shell: header + page. Must be signed in; each page and action then checks the
 * specific role it needs (a layout alone isn't enough — it doesn't re-run on every navigation).
 * Public booking pages live in app/(public) without this header.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
