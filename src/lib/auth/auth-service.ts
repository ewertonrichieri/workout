import { AUTH_CALLBACK_PATH, REDIRECT_QUERY_PARAMETER, sanitizeRedirectPath } from "@/lib/auth/route-access";
import { credentialsSchema, type Credentials } from "@/lib/auth/credentials-schema";
import { UnauthorizedError } from "@/lib/errors/app-errors";
import { translate, type TranslationKey } from "@/lib/i18n/translate";

interface AuthErrorLike {
  code?: string;
  message: string;
}

type AuthResult = Promise<{ error: AuthErrorLike | null }>;

/** Subset of Supabase `auth` used by the app (injected, so it can be faked in tests). */
export interface AuthClient {
  signInWithPassword(credentials: Credentials): AuthResult;
  signUp(input: Credentials & { options: { emailRedirectTo: string } }): Promise<{
    data: { session: unknown };
    error: AuthErrorLike | null;
  }>;
  signInWithOAuth(input: { provider: "google"; options: { redirectTo: string } }): Promise<{
    data: { url: string | null };
    error: AuthErrorLike | null;
  }>;
  exchangeCodeForSession(code: string): AuthResult;
  signOut(): AuthResult;
  getUser(): Promise<{ data: { user: { id: string } | null }; error: AuthErrorLike | null }>;
}

export type ServiceResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { success: false; error: string };

const SUPABASE_ERROR_MESSAGES: Record<string, TranslationKey> = {
  invalid_credentials: "auth.errors.invalidCredentials",
  email_not_confirmed: "auth.errors.emailNotConfirmed",
  user_already_exists: "auth.errors.userAlreadyExists",
  email_exists: "auth.errors.userAlreadyExists",
  weak_password: "auth.errors.weakPassword",
  over_request_rate_limit: "auth.errors.rateLimited",
  over_email_send_rate_limit: "auth.errors.rateLimited",
};

function toFailure(error: AuthErrorLike): { success: false; error: string } {
  const key = (error.code && SUPABASE_ERROR_MESSAGES[error.code]) || "auth.errors.generic";
  return { success: false, error: translate(key) };
}

function validateCredentials(input: unknown) {
  const parsed = credentialsSchema.safeParse(input);
  if (parsed.success) return { credentials: parsed.data };
  return { failure: { success: false as const, error: parsed.error.issues[0].message } };
}

function buildCallbackUrl(origin: string, next?: string): string {
  const callbackUrl = `${origin}${AUTH_CALLBACK_PATH}`;
  if (!next) return callbackUrl;
  return `${callbackUrl}?${REDIRECT_QUERY_PARAMETER}=${encodeURIComponent(sanitizeRedirectPath(next))}`;
}

export function createAuthService(authClient: AuthClient) {
  return {
    async signInWithPassword(input: unknown): Promise<ServiceResult> {
      const { credentials, failure } = validateCredentials(input);
      if (!credentials) return failure;
      const { error } = await authClient.signInWithPassword(credentials);
      return error ? toFailure(error) : { success: true };
    },

    async signUpWithPassword(
      input: unknown,
      origin: string,
    ): Promise<ServiceResult<{ needsEmailConfirmation: boolean }>> {
      const { credentials, failure } = validateCredentials(input);
      if (!credentials) return failure;
      const { data, error } = await authClient.signUp({
        ...credentials,
        options: { emailRedirectTo: buildCallbackUrl(origin) },
      });
      if (error) return toFailure(error);
      return { success: true, data: { needsEmailConfirmation: data.session === null } };
    },

    async getGoogleSignInUrl(origin: string, next?: string): Promise<ServiceResult<{ url: string }>> {
      const { data, error } = await authClient.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildCallbackUrl(origin, next) },
      });
      if (error || !data.url) return toFailure(error ?? { message: "missing OAuth url" });
      return { success: true, data: { url: data.url } };
    },

    async exchangeCodeForSession(code: string): Promise<ServiceResult> {
      const { error } = await authClient.exchangeCodeForSession(code);
      return error ? { success: false, error: translate("auth.errors.callbackFailed") } : { success: true };
    },

    async signOut(): Promise<void> {
      await authClient.signOut();
    },

    /** The only source of the user id: the authenticated session. */
    async getAuthenticatedUserId(): Promise<string> {
      const { data } = await authClient.getUser();
      if (!data.user) throw new UnauthorizedError(translate("errors.unauthorized"));
      return data.user.id;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
