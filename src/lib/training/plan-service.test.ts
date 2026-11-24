import { describe, expect, it, vi } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { PlanRepository } from "./plan-repository";
import { createPlanService } from "./plan-service";
import type { ActivePlan } from "./plan-types";
import type { ProgressionRepository } from "./progression-repository";

const TRACKED = buildWorkoutExercise(1, { sets: 2, trackProgression: true });
const PLAN: ActivePlan = {
  id: "p1", goal: "strength", origin: "manual", startsOn: "2026-11-01", validUntil: "2026-12-13",
  workouts: [buildWorkout("A", 1, [TRACKED, buildWorkoutExercise(2, { trackProgression: false })])],
};

function setup(plan: ActivePlan | null) {
  const planRepository: PlanRepository = { findActivePlan: vi.fn(async () => plan) };
  const progressionRepository: ProgressionRepository = {
    findLatestSetLoads: vi.fn(async () => [{ exerciseId: "exercise-1", setNumber: 1, loadKg: 20 }]),
  };
  const service = createPlanService({ planRepository, progressionRepository, getToday: () => "2026-11-22" });
  return { planRepository, progressionRepository, service };
}

describe("plan service", () => {
  it("returns the active plan with its validity and suggested loads", async () => {
    const { service, planRepository, progressionRepository } = setup(PLAN);
    const overview = await service.getActivePlanOverview("user-1");
    expect(planRepository.findActivePlan).toHaveBeenCalledWith("user-1");
    expect(progressionRepository.findLatestSetLoads).toHaveBeenCalledWith(["exercise-1"]);
    expect(overview).toEqual({
      plan: PLAN,
      validity: { totalDays: 42, elapsedDays: 21, remainingDays: 21, progress: 0.5, isExpired: false },
      suggestedLoads: { [TRACKED.id]: [20, 20] },
    });
  });

  it("returns null when the user has no active plan", async () => {
    const { service, progressionRepository } = setup(null);
    await expect(service.getActivePlanOverview("user-1")).resolves.toBeNull();
    expect(progressionRepository.findLatestSetLoads).not.toHaveBeenCalled();
  });
});
