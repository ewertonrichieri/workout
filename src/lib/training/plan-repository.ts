import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_STATUSES } from "@/lib/constants/training";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import { ACTIVE_PLAN_COLUMNS, mapActivePlanRow } from "./plan-row-mapping";
import type { ActivePlan } from "./plan-types";

export interface PlanRepository {
  findActivePlan(userId: string): Promise<ActivePlan | null>;
}

/** Plan reads through the user's Supabase session; RLS also restricts rows to the owner. */
export function createSupabasePlanRepository(client: SupabaseClient): PlanRepository {
  return {
    async findActivePlan(userId) {
      const { data, error } = await client
        .from("plans")
        .select(ACTIVE_PLAN_COLUMNS)
        .eq("user_id", userId)
        .eq("status", PLAN_STATUSES.active)
        .maybeSingle();
      if (error) throw new RepositoryError(translate("errors.internal"), "plans.findActivePlan");
      return data === null ? null : mapActivePlanRow(data);
    },
  };
}
