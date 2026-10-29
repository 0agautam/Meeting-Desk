"use client";

import { useEffect, useState } from "react";
import { BTN_PRIMARY, META, PAGE_LEDE, PAGE_TITLE } from "@/lib/ui/classes";
import { CRM_LAUNCHER } from "./crmContent";

type ZohoUser = { full_name?: string; email?: string; role?: { name?: string }; profile?: { name?: string } };
type ZohoSdk = {
  embeddedApp: { on: (event: string, handler: (data: unknown) => void) => void; init: () => Promise<unknown> };
  CRM: { CONFIG: { getCurrentUser: () => Promise<{ users?: ZohoUser[] }> } };
};
type State = { status: "checking" } | { status: "outside" } | { status: "ready"; user: ZohoUser };

/**
 * What the CRM tab shows: who Zoho CRM says is logged in (from the embedded-app SDK) and a button that opens the
 * real app in its own tab. The CRM user is only displayed, never used to sign anyone in: the app's own sign-in
 * decides who you are (the browser is what tells us this, so it can't be trusted for access).
 */
export default function CrmLauncher() {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    let alive = true;
    // The SDK only answers inside CRM; anywhere else init() never resolves, so stop waiting after a while.
    const timer = window.setTimeout(() => alive && setState((s) => (s.status === "ready" ? s : { status: "outside" })), CRM_LAUNCHER.waitMs);

    const script = document.createElement("script");
    script.src = CRM_LAUNCHER.sdkUrl;
    script.async = true;
    script.onload = () => {
      const zoho = (window as unknown as { ZOHO?: ZohoSdk }).ZOHO;
      if (!zoho) return;
      zoho.embeddedApp.on("PageLoad", () => {}); // Zoho's docs register this before init()
      zoho.embeddedApp
        .init()
        .then(() => zoho.CRM.CONFIG.getCurrentUser())
        .then((data) => {
          const user = data?.users?.[0];
          if (alive && user) setState({ status: "ready", user });
        })
        .catch((err: unknown) => console.warn("CrmLauncher: couldn't read the CRM user:", err));
    };
    script.onerror = () => alive && setState({ status: "outside" });
    document.head.appendChild(script);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      script.remove();
    };
  }, []);

  const user = state.status === "ready" ? state.user : null;
  const who = user ? [user.role?.name, user.profile?.name].filter(Boolean).join(" · ") : "";

  return (
    <section className="flex w-full max-w-[460px] flex-col gap-4 rounded-panel border border-line bg-card px-7 py-6">
      <div>
        <h1 className={PAGE_TITLE}>{CRM_LAUNCHER.title}</h1>
        <p className={PAGE_LEDE}>{CRM_LAUNCHER.lede}</p>
      </div>

      <div aria-live="polite" className="rounded-card bg-ground px-4 py-3 text-[13px] text-body">
        {user ? (
          <>
            <div className="font-semibold text-ink">{CRM_LAUNCHER.signedInAs(user.full_name ?? user.email ?? "your account")}</div>
            {user.email ? <div className="text-muted">{user.email}</div> : null}
            {who ? <div className="text-muted">{who}</div> : null}
          </>
        ) : state.status === "outside" ? (
          CRM_LAUNCHER.outside
        ) : (
          CRM_LAUNCHER.checking
        )}
      </div>

      <div>
        {/* A new tab: this page sits in a CRM frame, and the app is not built to run inside one. Goes through
            Zoho sign-in, which a browser already signed in to Zoho passes without a form. */}
        <a href="/api/zoho/signin" target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}>
          {CRM_LAUNCHER.openButton}
        </a>
        <p className={`${META} mb-0 mt-2`}>{CRM_LAUNCHER.openHint}</p>
      </div>
    </section>
  );
}
