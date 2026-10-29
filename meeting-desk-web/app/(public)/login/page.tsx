import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LOGIN_PAGE } from "@/components/auth/authContent";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathFor } from "@/lib/auth/permissions";
import { BTN_PRIMARY, PAGE_LEDE, PAGE_TITLE, PANEL } from "@/lib/ui/classes";

export const metadata: Metadata = { title: LOGIN_PAGE.metaTitle };

/** Staff sign-in. Public. Already signed in → straight to your own page. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));

  const { error } = await searchParams;
  const zohoError = typeof error === "string" ? (LOGIN_PAGE.zohoErrors as Record<string, string>)[error] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 py-12 max-md:py-8">
      <section className={`${PANEL} flex flex-col gap-4`}>
        <div>
          <h1 className={PAGE_TITLE}>{LOGIN_PAGE.title}</h1>
          <p className={PAGE_LEDE}>{LOGIN_PAGE.lede}</p>
        </div>
        {zohoError ? (
          <p role="alert" className="text-xs text-attention">
            {zohoError}
          </p>
        ) : null}
        {/* A plain link: the sign-in route redirects on to Zoho, which a client-side navigation can't follow. */}
        <a href="/api/zoho/signin" className={`${BTN_PRIMARY} w-full`}>
          {LOGIN_PAGE.zohoButton}
        </a>
        <p className="m-0 text-center text-xs text-muted">{LOGIN_PAGE.or}</p>
        <LoginForm />
      </section>
    </div>
  );
}
