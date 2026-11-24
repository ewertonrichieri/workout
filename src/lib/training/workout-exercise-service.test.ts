import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { PlanRepository } from "./plan-repository";
import { createWorkoutExerciseService, type WorkoutExerciseRepository } from "./workout-exercise-service";

const OWN_ID = "11111111-1111-4111-8111-111111111111";
const PLAN = buildPlanOverview([buildWorkout("A", 1, [buildWorkoutExercise(1, { id: OWN_ID })])]).plan;

function setup() {
  const planRepository: PlanRepository = { findActivePlan: vi.fn(async () => PLAN) };
  const repository: WorkoutExerciseRepository = { updateTrackProgression: vi.fn(async () => undefined) };
  return { repository, service: createWorkoutExerciseService(planRepository, repository) };
}

describe("workout exercise service: setTrackProgression", () => {
  it("updates an exercise of the user's active plan", async () => {
    const { service, repository } = setup();
    await expect(service.setTrackProgression("user-1", OWN_ID, { trackProgression: false })).resolves.toEqual({ trackProgression: false });
    expect(repository.updateTrackProgression).toHaveBeenCalledWith(OWN_ID, false);
  });

  it("rejects invalid input and exercises outside the active plan", async () => {
    const { service, repository } = setup();
    await expect(service.setTrackProgression("user-1", "not-a-uuid", { trackProgression: true })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.setTrackProgression("user-1", OWN_ID, { trackProgression: "yes" })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.setTrackProgression("user-1", "33333333-3333-4333-8333-333333333333", { trackProgression: true })).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.updateTrackProgression).not.toHaveBeenCalled();
  });
});
