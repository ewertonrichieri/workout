import "server-only";
import { headers } from "next/headers";
import { createAuthService, type AuthService } from "@/lib/auth/auth-service";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

/** Composition root for authentication on the server. */
export async function createServerAuthService(): Promise<AuthService> {
  const supabase = await createServerSupabaseClient();
  return createAuthService(supabase.auth);
}

/** Central helper: the user id comes only from the authenticated session. */
export async function getAuthenticatedUserId(): Promise<string> {
  const authService = await createServerAuthService();
  return authService.getAuthenticatedUserId();
}

/** Origin of the current request, used to build OAuth/e-mail redirect URLs. */
export async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${requestHeaders.get("host")}`;
}
