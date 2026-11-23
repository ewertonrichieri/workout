import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, REDIRECT_QUERY_PARAMETER, sanitizeRedirectPath } from "@/lib/auth/route-access";
import { createServerAuthService } from "@/lib/auth/server-auth";
import { createLogger } from "@/lib/logger/logger";
import { getConfig } from "@/lib/config/config";

const CALLBACK_ERROR_QUERY = "error=callback";

/** Exchanges the code sent by Supabase (Google login or e-mail confirmation) for a session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get(REDIRECT_QUERY_PARAMETER));
  const failureUrl = new URL(`${LOGIN_PATH}?${CALLBACK_ERROR_QUERY}`, request.url);

  if (!code) return NextResponse.redirect(failureUrl);

  const authService = await createServerAuthService();
  const result = await authService.exchangeCodeForSession(code);
  if (!result.success) {
    createLogger({ minimumLevel: getConfig().logLevel }).warn("auth callback failed", {
      route: "/auth/callback",
    });
    return NextResponse.redirect(failureUrl);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
