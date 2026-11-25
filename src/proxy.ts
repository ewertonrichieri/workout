import { NextResponse, type NextRequest } from "next/server";
import { decideRouteAccess } from "@/lib/auth/route-access";
import { HTTP_STATUS } from "@/lib/constants/http";
import { buildErrorResponse } from "@/lib/errors/api-response";
import { UnauthorizedError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import { refreshSession } from "@/lib/supabase/proxy-session";

function withSessionCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await refreshSession(request);
  const decision = decideRouteAccess({ pathname: request.nextUrl.pathname, isAuthenticated });

  if (decision.type === "allow") return response;

  if (decision.type === "unauthorized") {
    const { body } = buildErrorResponse(new UnauthorizedError(translate("errors.unauthorized")));
    return withSessionCookies(NextResponse.json(body, { status: HTTP_STATUS.UNAUTHORIZED }), response);
  }

  return withSessionCookies(NextResponse.redirect(new URL(decision.location, request.url)), response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mediapipe/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
