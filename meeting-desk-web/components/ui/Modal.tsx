"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A popup whose open state lives in the address (the caller renders it only when, say, ?add=1 is set), so closing
 * means going to `closeHref`: the X button, a click on the dimmed background, or Escape.
 * shortcut: focus moves into the dialog but isn't trapped, upgrade if keyboard users start tabbing out behind it.
 */
export default function Modal({
  title,
  subtitle,
  closeHref,
  closeLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  closeHref: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 max-sm:p-0 sm:items-center" onClick={() => router.push(closeHref)}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-[680px] max-w-full rounded-panel border border-line bg-card shadow-[0_24px_60px_-12px_rgb(0_0_0/0.35)] outline-none max-sm:min-h-dvh max-sm:rounded-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-5 max-sm:px-4">
          <div>
            <h2 id="modal-title" className="m-0 font-serif text-xl font-semibold text-ink">
              {title}
            </h2>
            {subtitle ? <p className="m-0 mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => router.push(closeHref)}
            className="-mr-2 -mt-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-field border-0 bg-transparent text-2xl leading-none text-muted hover:bg-ground hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="px-7 py-6 max-sm:px-4">{children}</div>
      </div>
    </div>
  );
}
