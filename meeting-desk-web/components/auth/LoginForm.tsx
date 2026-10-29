"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/(public)/login/actions";
import { BTN_PRIMARY, FIELD_INPUT, FIELD_LABEL } from "@/lib/ui/classes";
import { LOGIN_PAGE } from "./authContent";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={FIELD_LABEL} htmlFor="email">
          {LOGIN_PAGE.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder={LOGIN_PAGE.emailPlaceholder}
          aria-describedby={state?.error ? "sign-in-error" : undefined}
          aria-invalid={state?.error ? true : undefined}
          className={FIELD_INPUT}
        />
        {state?.error ? (
          <p id="sign-in-error" role="alert" className="mt-2 text-xs text-attention">
            {state.error}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className={`${BTN_PRIMARY} disabled:cursor-wait disabled:opacity-70`}>
        {pending ? LOGIN_PAGE.submitting : LOGIN_PAGE.submit}
      </button>
    </form>
  );
}
