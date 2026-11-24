import type { PlanRepository } from "./plan-repository";
import type { ActivePlanOverview } from "./plan-types";
import { computePlanValidity } from "./plan-validity";

export interface PlanService {
  /** Active plan of the user with its validity for today; `null` when there is none. */
  getActivePlanOverview(userId: string): Promise<ActivePlanOverview | null>;
}

/** `getToday` returns the current calendar date (YYYY-MM-DD); injected to keep the service testable. */
export function createPlanService(repository: PlanRepository, getToday: () => string): PlanService {
  return {
    async getActivePlanOverview(userId) {
      const plan = await repository.findActivePlan(userId);
      if (!plan) return null;
      return { plan, validity: computePlanValidity({ startsOn: plan.startsOn, validUntil: plan.validUntil, today: getToday() }) };
    },
  };
}
