import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { PlanRepository } from "./plan-repository";
import type { WorkoutEditRepository } from "./workout-edit-repository";
import { createWorkoutEditService } from "./workout-edit-service";

const WORKOUT_ID = "11111111-1111-4111-8111-111111111111";
const KEPT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";

const PLAN = buildPlanOverview([buildWorkout("A", 1, [buildWorkoutExercise(1, { id: KEPT_ID })])]).plan;
PLAN.workouts[0].id = WORKOUT_ID;

const KEPT = { id: KEPT_ID, exerciseSlug: "fake-exercise-1", category: null, sets: 4, repsMin: 6, repsMax: 8, restSeconds: 90, notes: null };
const ADDED = { id: null, exerciseSlug: "goblet-squat", category: "Principal", sets: 3, repsMin: 10, repsMax: 10, restSeconds: null, notes: null };

function setup() {
  const planRepository: PlanRepository = { findActivePlan: vi.fn(async () => PLAN) };
  const repository: WorkoutEditRepository = { saveWorkoutExercises: vi.fn(async () => undefined) };
  return { repository, service: createWorkoutEditService(planRepository, repository) };
}

describe("workout edit service", () => {
  it("saves kept and new exercises in the order sent", async () => {
    const { service, repository } = setup();
    await expect(service.saveWorkoutExercises("user-1", WORKOUT_ID, { exercises: [ADDED, KEPT] })).resolves.toEqual({ workoutId: WORKOUT_ID });
    expect(repository.saveWorkoutExercises).toHaveBeenCalledWith(WORKOUT_ID, [ADDED, KEPT]);
  });

  it("turns a swapped exercise into a new item (no suggested load from the old one)", async () => {
    const { service, repository } = setup();
    await service.saveWorkoutExercises("user-1", WORKOUT_ID, { exercises: [{ ...KEPT, exerciseSlug: "goblet-squat" }] });
    expect(repository.saveWorkoutExercises).toHaveBeenCalledWith(WORKOUT_ID, [{ ...KEPT, id: null, exerciseSlug: "goblet-squat" }]);
  });

  it("rejects invalid ids or bodies", async () => {
    const { service } = setup();
    await expect(service.saveWorkoutExercises("user-1", "x", { exercises: [KEPT] })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.saveWorkoutExercises("user-1", WORKOUT_ID, { exercises: [] })).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("only edits workouts of the user's active plan", async () => {
    await expect(setup().service.saveWorkoutExercises("user-1", OTHER_ID, { exercises: [KEPT] })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects repeated exercises or items from another workout", async () => {
    const { service, repository } = setup();
    await expect(service.saveWorkoutExercises("user-1", WORKOUT_ID, { exercises: [ADDED, { ...ADDED }] })).rejects.toBeInstanceOf(UnprocessableError);
    await expect(service.saveWorkoutExercises("user-1", WORKOUT_ID, { exercises: [{ ...KEPT, id: OTHER_ID }] })).rejects.toBeInstanceOf(UnprocessableError);
    expect(repository.saveWorkoutExercises).not.toHaveBeenCalled();
  });
});
