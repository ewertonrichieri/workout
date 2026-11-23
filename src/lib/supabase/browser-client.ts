import { createBrowserClient } from "@supabase/ssr";
import { getPublicConfig } from "@/lib/config/public-config";

/** Browser client: authentication only. Data access goes through the app's server/API. */
export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicConfig();
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
