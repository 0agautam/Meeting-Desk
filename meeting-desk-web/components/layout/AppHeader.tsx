import Link from "next/link";
import RoleSwitcher from "@/components/layout/RoleSwitcher";
import NavLink from "@/components/layout/NavLink";
import { PREVIEW_ROLES, type PreviewRole } from "@/lib/preview-role";
import { APP_NAV } from "@/components/layout/layoutContent";

/** Dark top bar from the wireframes: brand · nav · current person. Server component. */
export default function AppHeader({ role }: { role: PreviewRole }) {
  const options = PREVIEW_ROLES.map(({ value, label }) => ({ value, label }));

  return (
    <header className="bg-ink text-ground">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-8 px-8 max-md:gap-4 max-md:px-4">
        <Link href="/" className="font-serif text-xl font-semibold text-ground no-underline hover:text-ground">
          Meeting Desk
        </Link>
        <nav aria-label="Main" className="flex flex-1 gap-1">
          {APP_NAV.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <RoleSwitcher current={role} options={options} />
      </div>
    </header>
  );
}
