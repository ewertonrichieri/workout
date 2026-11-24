import type { PlanRepository } from "./plan-repository";
import type { ActivePlanOverview } from "./plan-types";
import { computePlanValidity } from "./plan-validity";
import type { ProgressionRepository } from "./progression-repository";
import { buildSuggestedLoads, collectTrackedExerciseIds } from "./suggested-loads";

export interface PlanService {
  /** Active plan of the user with its validity for today and suggested loads; `null` when there is none. */
  getActivePlanOverview(userId: string): Promise<ActivePlanOverview | null>;
}

interface PlanServiceDependencies {
  planRepository: PlanRepository;
  progressionRepository: ProgressionRepository;
  /** Current calendar date (YYYY-MM-DD); injected to keep the service testable. */
  getToday: () => string;
}

export function createPlanService({ planRepository, progressionRepository, getToday }: PlanServiceDependencies): PlanService {
  return {
    async getActivePlanOverview(userId) {
      const plan = await planRepository.findActivePlan(userId);
      if (!plan) return null;
      const latestLoads = await progressionRepository.findLatestSetLoads(collectTrackedExerciseIds(plan.workouts));
      return {
        plan,
        validity: computePlanValidity({ startsOn: plan.startsOn, validUntil: plan.validUntil, today: getToday() }),
        suggestedLoads: buildSuggestedLoads(plan.workouts, latestLoads),
      };
    },
  };
}
