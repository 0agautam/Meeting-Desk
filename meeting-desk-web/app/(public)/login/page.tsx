import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LOGIN_PAGE } from "@/components/auth/authContent";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathFor } from "@/lib/auth/permissions";
import { BTN_PRIMARY, META, PAGE_TITLE } from "@/lib/ui/classes";

export const metadata: Metadata = { title: LOGIN_PAGE.metaTitle };

/** Staff sign-in. Public. Already signed in → straight to your own page. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));

  const { error } = await searchParams;
  const zohoError = typeof error === "string" ? (LOGIN_PAGE.zohoErrors as Record<string, string>)[error] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-5 py-10 max-md:py-6">
      <section className="flex flex-col gap-5 rounded-panel border border-line bg-card px-8 py-9 text-center max-md:px-5">
        <Image src="/abr-logo.png" alt="" width={200} height={153} unoptimized priority className="mx-auto h-auto w-16" />
        <div>
          <h1 className={PAGE_TITLE}>{LOGIN_PAGE.title}</h1>
          <p className="m-0 mt-2 text-muted">{LOGIN_PAGE.lede}</p>
        </div>

        {zohoError ? (
          <p role="alert" className="m-0 text-xs text-attention">
            {zohoError}
          </p>
        ) : null}

        {/* A plain link: the sign-in route redirects on to Zoho, which a client-side navigation can't follow. */}
        <a href="/api/zoho/signin" className={`${BTN_PRIMARY} w-full`}>
          <span aria-hidden="true" className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-card text-[11px] font-semibold text-ink">
            Z
          </span>
          {LOGIN_PAGE.zohoButton}
        </a>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className={`${META} m-0`}>{LOGIN_PAGE.or}</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <details className="group text-left">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center text-[13px] font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
            {LOGIN_PAGE.emailToggle}
          </summary>
          <div className="pt-2">
            <LoginForm />
          </div>
        </details>

        <p className={`${META} m-0`}>{LOGIN_PAGE.needAccess}</p>
      </section>
    </div>
  );
}
