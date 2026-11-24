import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "./plan-repository";
import { createSupabaseSessionRepository } from "./session-repository";
import { createSessionService, type SessionService } from "./session-service";

/** Composition root for workout sessions on the server. */
export async function createServerSessionService(): Promise<SessionService> {
  const supabase = await createServerSupabaseClient();
  return createSessionService(createSupabasePlanRepository(supabase), createSupabaseSessionRepository(supabase));
}
