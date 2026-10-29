"use client";

import { useActionState } from "react";
import { generateEmail, type GenerateEmailState } from "@/app/(staff)/desk/[id]/actions";
import { BTN, BTN_PRIMARY, META } from "@/lib/ui/classes";
import { DESK_DETAIL } from "./deskContent";
import GenerateResult from "./GenerateResult";

/** "Generate email" / "Regenerate" — runs the calendar lookup on the server and shows any failure right here. */
export default function GenerateEmailButton({ requestId, hostName, regenerate = false }: { requestId: string; hostName: string; regenerate?: boolean }) {
  const [state, formAction, pending] = useActionState<GenerateEmailState, FormData>(generateEmail, null);

  return (
    <div className="flex flex-col gap-1.5">
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="requestId" value={requestId} />
      <button type="submit" disabled={pending} className={`${regenerate ? BTN : BTN_PRIMARY} disabled:cursor-wait disabled:opacity-70`}>
        {pending ? DESK_DETAIL.generating : regenerate ? DESK_DETAIL.regenerate : DESK_DETAIL.generate}
      </button>
      {!regenerate && !pending && !state ? <p className={`${META} m-0 max-w-[420px]`}>{DESK_DETAIL.generateHint}</p> : null}
    </form>
    <GenerateResult state={state} requestId={requestId} hostName={hostName} />
    </div>
  );
}
