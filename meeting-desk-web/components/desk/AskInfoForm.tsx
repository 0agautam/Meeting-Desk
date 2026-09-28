"use client";

import { useState } from "react";
import { askForInfo } from "@/app/(staff)/desk/[id]/actions";
import { BTN_GHOST, FIELD_TEXTAREA } from "@/lib/ui/classes";
import { DESK_DETAIL } from "./deskContent";

/** Wireframe 3's "Ask {host} for info" — toggles open a small question form. */
export default function AskInfoForm({ requestId, hostName }: { requestId: string; hostName: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${BTN_GHOST} text-attention`}>
        {DESK_DETAIL.askForInfo(hostName)}
      </button>
    );
  }

  return (
    <form action={askForInfo} className="flex w-full flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <textarea name="message" required rows={2} className={FIELD_TEXTAREA} placeholder={DESK_DETAIL.askPlaceholder} />
      <div className="flex gap-2">
        <button type="submit" className="inline-flex h-11 items-center rounded-field border border-ink bg-ink px-4 font-semibold text-white">
          {DESK_DETAIL.askSubmit}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={BTN_GHOST}>
          {DESK_DETAIL.askCancel}
        </button>
      </div>
    </form>
  );
}
