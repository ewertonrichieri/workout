import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicConfig } from "@/lib/config/public-config";

interface RefreshedSession {
  response: NextResponse;
  isAuthenticated: boolean;
}

/** Refreshes the Supabase session cookies on every request and reports whether a user is signed in. */
export async function refreshSession(request: NextRequest): Promise<RefreshedSession> {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getPublicConfig();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the token with Supabase (unlike getSession, which trusts the cookie).
  const { data } = await supabase.auth.getUser();
  return { response, isAuthenticated: data.user !== null };
}
