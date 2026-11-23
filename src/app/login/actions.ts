"use server";

import { redirect } from "next/navigation";
import { HOME_PATH, LOGIN_PATH, REDIRECT_QUERY_PARAMETER, sanitizeRedirectPath } from "@/lib/auth/route-access";
import { createServerAuthService, getRequestOrigin } from "@/lib/auth/server-auth";
import { translate } from "@/lib/i18n/translate";

export interface LoginFormState {
  error?: string;
  notice?: string;
}

function readCredentials(formData: FormData) {
  return { email: formData.get("email"), password: formData.get("password") };
}

function readNext(formData: FormData): string {
  const next = formData.get(REDIRECT_QUERY_PARAMETER);
  return sanitizeRedirectPath(typeof next === "string" ? next : null);
}

export async function signInWithPasswordAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const authService = await createServerAuthService();
  const result = await authService.signInWithPassword(readCredentials(formData));
  if (!result.success) return { error: result.error };
  redirect(readNext(formData));
}

export async function signUpWithPasswordAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const authService = await createServerAuthService();
  const result = await authService.signUpWithPassword(readCredentials(formData), await getRequestOrigin());
  if (!result.success) return { error: result.error };
  if (result.data.needsEmailConfirmation) return { notice: translate("auth.confirmEmailSent") };
  redirect(HOME_PATH);
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const authService = await createServerAuthService();
  const result = await authService.getGoogleSignInUrl(await getRequestOrigin(), readNext(formData));
  redirect(result.success ? result.data.url : `${LOGIN_PATH}?error=callback`);
}

export async function signOutAction(): Promise<void> {
  const authService = await createServerAuthService();
  await authService.signOut();
  redirect(LOGIN_PATH);
}
