import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { PlanRepository } from "./plan-repository";
import type { SessionRepository } from "./session-repository";
import { createSessionService } from "./session-service";

const WORKOUT_ID = "11111111-1111-4111-8111-111111111111";
const EXERCISE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";
const STARTED_AT = "2026-11-24T10:00:00.000Z";

const PLAN = buildPlanOverview([buildWorkout("A", 1, [buildWorkoutExercise(1, { id: EXERCISE_ID, sets: 2 })])]).plan;
PLAN.workouts[0].id = WORKOUT_ID;

function setup() {
  const planRepository: PlanRepository = { findActivePlan: vi.fn(async () => PLAN) };
  const sessionRepository: SessionRepository = { finishSession: vi.fn(async () => "session-1") };
  return { sessionRepository, service: createSessionService(planRepository, sessionRepository) };
}

function buildInput(sets: unknown[]) {
  return { workoutId: WORKOUT_ID, startedAt: STARTED_AT, sets };
}

const VALID_SET = { workoutExerciseId: EXERCISE_ID, setNumber: 1, repsDone: 10, loadKg: 12.5 };

describe("session service: finishWorkout", () => {
  it("saves the checked sets of a workout of the active plan", async () => {
    const { service, sessionRepository } = setup();
    await expect(service.finishWorkout("user-1", buildInput([VALID_SET, { ...VALID_SET, setNumber: 2, loadKg: null }]))).resolves.toEqual({ sessionId: "session-1" });
    expect(sessionRepository.finishSession).toHaveBeenCalledWith({
      workoutId: WORKOUT_ID,
      startedAt: STARTED_AT,
      sets: [{ ...VALID_SET, effort: null }, { ...VALID_SET, setNumber: 2, loadKg: null, effort: null }],
      readinessCheckinId: null,
    });
  });

  it("accepts an optional effort per set and rejects unknown values (step 3B.3)", async () => {
    const { service, sessionRepository } = setup();
    await service.finishWorkout("user-1", buildInput([{ ...VALID_SET, effort: "max" }]));
    expect(sessionRepository.finishSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [{ ...VALID_SET, effort: "max" }] }));
    await expect(service.finishWorkout("user-1", buildInput([{ ...VALID_SET, effort: "hard" }]))).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("passes the check-in of the day and rejects an invalid id", async () => {
    const { service, sessionRepository } = setup();
    const checkinId = "44444444-4444-4444-8444-444444444444";
    await service.finishWorkout("user-1", { ...buildInput([VALID_SET]), readinessCheckinId: checkinId });
    expect(sessionRepository.finishSession).toHaveBeenCalledWith(expect.objectContaining({ readinessCheckinId: checkinId }));
    await expect(service.finishWorkout("user-1", { ...buildInput([VALID_SET]), readinessCheckinId: "abc" })).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects input outside the schema", async () => {
    const { service } = setup();
    await expect(service.finishWorkout("user-1", buildInput([{ ...VALID_SET, loadKg: 10000 }]))).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.finishWorkout("user-1", { workoutId: "x" })).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("requires at least one set", async () => {
    await expect(setup().service.finishWorkout("user-1", buildInput([]))).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("rejects a workout outside the user's active plan", async () => {
    const { service } = setup();
    await expect(service.finishWorkout("user-1", { ...buildInput([VALID_SET]), workoutId: OTHER_ID })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects sets that do not match the prescription", async () => {
    const { service, sessionRepository } = setup();
    await expect(service.finishWorkout("user-1", buildInput([{ ...VALID_SET, workoutExerciseId: OTHER_ID }]))).rejects.toBeInstanceOf(UnprocessableError);
    await expect(service.finishWorkout("user-1", buildInput([{ ...VALID_SET, setNumber: 3 }]))).rejects.toBeInstanceOf(UnprocessableError);
    await expect(service.finishWorkout("user-1", buildInput([VALID_SET, VALID_SET]))).rejects.toBeInstanceOf(UnprocessableError);
    expect(sessionRepository.finishSession).not.toHaveBeenCalled();
  });
});
