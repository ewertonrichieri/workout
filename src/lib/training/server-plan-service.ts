import "server-only";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "./plan-repository";
import { createPlanService, type PlanService } from "./plan-service";
import { toDateInTimeZone } from "./plan-validity";

/** Composition root for plans on the server. */
export async function createServerPlanService(): Promise<PlanService> {
  const supabase = await createServerSupabaseClient();
  return createPlanService(createSupabasePlanRepository(supabase), () => toDateInTimeZone(new Date(), APP_TIME_ZONE));
}
