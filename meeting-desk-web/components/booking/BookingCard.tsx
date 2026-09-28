import type { ReactNode } from "react";
import { PAGE_LEDE, PAGE_TITLE } from "@/lib/ui/classes";

/**
 * Result screens (wireframes 7/8) are flat — just page padding, no outer bordered
 * panel. Any bordered card (e.g. the meeting summary) is passed in via children.
 */
export default function BookingCard({
  title,
  lede,
  icon,
  children,
}: {
  title: string;
  lede?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-4 px-5 py-7">
      {icon}
      <div>
        <h1 className={PAGE_TITLE}>{title}</h1>
        {lede ? <p className={PAGE_LEDE}>{lede}</p> : null}
      </div>
      {children}
    </div>
  );
}
