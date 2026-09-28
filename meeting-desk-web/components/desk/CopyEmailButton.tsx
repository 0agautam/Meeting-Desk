"use client";

import { useState } from "react";
import { logEmailCopied } from "@/app/(staff)/desk/[id]/actions";
import { DESK_DETAIL } from "./deskContent";

/** Wireframe 3's "Copy email" — writes to the clipboard, then logs an email_copied event. */
export default function CopyEmailButton({ requestId, draft }: { requestId: string; draft: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the draft is still visible to copy by hand.
    }
    await logEmailCopied(requestId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-field border border-accent bg-accent px-[18px] font-semibold text-white no-underline hover:bg-accent-strong"
    >
      {copied ? DESK_DETAIL.copied : DESK_DETAIL.copyEmail}
    </button>
  );
}
