"use client";

import { useActionState } from "react";
import { translate } from "@/lib/i18n/translate";
import { REDIRECT_QUERY_PARAMETER } from "@/lib/auth/route-access";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials-schema";
import {
  signInWithGoogleAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
  type LoginFormState,
} from "@/app/login/actions";

const INITIAL_STATE: LoginFormState = {};

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-neutral-400 bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";
const BUTTON_CLASS =
  "min-h-11 w-full rounded-lg px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60";

interface LoginFormProps {
  next: string;
  initialError?: string;
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [signInState, signIn, isSigningIn] = useActionState(signInWithPasswordAction, INITIAL_STATE);
  const [signUpState, signUp, isSigningUp] = useActionState(signUpWithPasswordAction, INITIAL_STATE);
  const isPending = isSigningIn || isSigningUp;
  const error = signInState.error ?? signUpState.error ?? initialError;

  return (
    <div className="flex flex-col gap-6">
      <form action={signInWithGoogleAction}>
        <input type="hidden" name={REDIRECT_QUERY_PARAMETER} value={next} />
        <button type="submit" className={`${BUTTON_CLASS} border border-neutral-400`}>
          {translate("auth.googleButton")}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">{translate("auth.divider")}</p>

      <form className="flex flex-col gap-4" action={signIn}>
        <input type="hidden" name={REDIRECT_QUERY_PARAMETER} value={next} />
        <label className="flex flex-col gap-1">
          <span>{translate("auth.emailLabel")}</span>
          <input name="email" type="email" autoComplete="email" required className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1">
          <span>{translate("auth.passwordLabel")}</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-describedby="password-hint"
            className={INPUT_CLASS}
          />
          <span id="password-hint" className="text-sm text-neutral-500">
            {translate("auth.passwordHint")}
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {signUpState.notice && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            {signUpState.notice}
          </p>
        )}

        <button type="submit" disabled={isPending} className={`${BUTTON_CLASS} bg-foreground text-background`}>
          {isSigningIn ? translate("auth.pending") : translate("auth.signInButton")}
        </button>
        <button
          type="submit"
          formAction={signUp}
          disabled={isPending}
          className={`${BUTTON_CLASS} border border-neutral-400`}
        >
          {isSigningUp ? translate("auth.pending") : translate("auth.signUpButton")}
        </button>
      </form>
    </div>
  );
}
