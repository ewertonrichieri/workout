import type { PlanRepository } from "./plan-repository";
import type { ActivePlan, ActivePlanOverview } from "./plan-types";
import { computePlanValidity } from "./plan-validity";
import type { ProgressionRepository } from "./progression-repository";
import { buildLoadIncreases, type LoadIncreases } from "./load-increases";
import { buildSuggestedLoads, collectTrackedExerciseIds, type SuggestedLoads } from "./suggested-loads";

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

/** An earned increase replaces the repeated load in every prescribed set (step 3.5). */
function applyIncreases(plan: ActivePlan, suggestedLoads: SuggestedLoads, increases: LoadIncreases): SuggestedLoads {
  const result = { ...suggestedLoads };
  for (const item of plan.workouts.flatMap((workout) => workout.exercises)) {
    const increase = increases[item.id];
    if (increase) result[item.id] = Array.from({ length: item.sets }, () => increase.toKg);
  }
  return result;
}

export function createPlanService({ planRepository, progressionRepository, getToday }: PlanServiceDependencies): PlanService {
  return {
    async getActivePlanOverview(userId) {
      const plan = await planRepository.findActivePlan(userId);
      if (!plan) return null;
      const latestLoads = await progressionRepository.findLatestSetLoads(collectTrackedExerciseIds(plan.workouts));
      const loadIncreases = buildLoadIncreases(plan.workouts, latestLoads);
      return {
        plan,
        validity: computePlanValidity({ startsOn: plan.startsOn, validUntil: plan.validUntil, today: getToday() }),
        suggestedLoads: applyIncreases(plan, buildSuggestedLoads(plan.workouts, latestLoads), loadIncreases),
        loadIncreases,
      };
    },
  };
}
