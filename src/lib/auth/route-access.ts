export const LOGIN_PATH = "/login";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const HOME_PATH = "/";
export const REDIRECT_QUERY_PARAMETER = "next";

const API_PATH_PREFIX = "/api/";
const PUBLIC_PATH_PREFIXES = ["/auth/", "/icon/"];
/** Installable app files (step 3.8): the browser fetches them without a session. */
const PUBLIC_EXACT_PATHS = ["/manifest.webmanifest", "/apple-icon"];

export type RouteAccessDecision =
  | { type: "allow" }
  | { type: "redirect"; location: string }
  | { type: "unauthorized" };

interface RouteAccessInput {
  pathname: string;
  isAuthenticated: boolean;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === LOGIN_PATH || PUBLIC_EXACT_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function buildLoginLocation(destination: string): string {
  if (destination === HOME_PATH) return LOGIN_PATH;
  return `${LOGIN_PATH}?${REDIRECT_QUERY_PARAMETER}=${encodeURIComponent(destination)}`;
}

/** Central access rule applied by the proxy to every request. */
export function decideRouteAccess({ pathname, isAuthenticated }: RouteAccessInput): RouteAccessDecision {
  if (pathname === LOGIN_PATH && isAuthenticated) return { type: "redirect", location: HOME_PATH };
  if (isPublicPath(pathname) || isAuthenticated) return { type: "allow" };
  if (pathname.startsWith(API_PATH_PREFIX)) return { type: "unauthorized" };
  return { type: "redirect", location: buildLoginLocation(pathname) };
}

/** Only internal paths are accepted, preventing open redirects. */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return HOME_PATH;
  }
  return path;
}
