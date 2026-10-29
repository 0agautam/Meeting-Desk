import Link from "next/link";
import { signOut } from "@/app/(public)/login/actions";
import { LOGIN_PAGE } from "@/components/auth/authContent";
import NavLink from "@/components/layout/NavLink";
import { navFor, roleLabel } from "@/lib/auth/permissions";
import type { Staff } from "@/lib/types";

/** Dark top bar from the wireframes: brand · nav (only what this person may use) · who's signed in. Server component. */
export default function AppHeader({ user }: { user: Staff }) {
  return (
    <header className="bg-ink text-ground">
      <div className="flex h-14 w-full items-center gap-8 px-6 max-md:gap-4 max-md:px-4">
        <Link href="/" className="font-serif text-xl font-semibold text-ground no-underline hover:text-ground">
          Meeting Desk
        </Link>
        <nav aria-label="Main" className="flex flex-1 gap-1">
          {navFor(user).map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-[13px]">
          <div className="text-right leading-tight max-md:hidden">
            <div className="font-medium text-ground">{user.name}</div>
            <div className="text-nav-idle">{roleLabel(user.roles)}</div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="h-11 cursor-pointer rounded-field border border-nav-active bg-nav-active px-3 text-ground hover:bg-nav-idle hover:text-ink"
            >
              {LOGIN_PAGE.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
