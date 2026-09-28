"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Header nav link with the wireframe's active pill. Client only because it reads the path. */
export default function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-md px-3 no-underline ${
        active ? "bg-nav-active font-medium text-ground hover:text-ground" : "text-nav-idle hover:text-ground"
      }`}
    >
      {children}
    </Link>
  );
}
