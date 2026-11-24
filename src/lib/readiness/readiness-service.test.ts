import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { PlanRepository } from "@/lib/training/plan-repository";
import type { ReadinessRepository } from "./readiness-repository";
import { createReadinessService, type SessionMinutesSource } from "./readiness-service";

const WORKOUT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_WORKOUT_ID = "22222222-2222-4222-8222-222222222222";
const PLAN = buildPlanOverview([buildWorkout("A", 1, [buildWorkoutExercise(1)])]).plan;
PLAN.workouts[0].id = WORKOUT_ID;

const INPUT = { workoutId: WORKOUT_ID, sleepQuality: "good", energyLevel: "normal", availableMinutes: 60, pains: [] };

function setup(sessionMinutes: number | null = 60) {
  const planRepository: PlanRepository = { findActivePlan: vi.fn(async () => PLAN) };
  const readinessRepository: ReadinessRepository = { saveCheckin: vi.fn(async () => "checkin-1") };
  const sessionMinutesSource: SessionMinutesSource = { findLatestSessionMinutes: vi.fn(async () => sessionMinutes) };
  return { readinessRepository, service: createReadinessService({ planRepository, readinessRepository, sessionMinutesSource }) };
}

describe("readiness service: saveCheckin", () => {
  it("saves the check-in and reports that the workout stays as it is on a good day", async () => {
    const { service, readinessRepository } = setup();
    await expect(service.saveCheckin("user-1", INPUT)).resolves.toEqual({ checkinId: "checkin-1", needsAdjustment: false, hasSeverePain: false });
    expect(readinessRepository.saveCheckin).toHaveBeenCalledWith(INPUT);
  });

  it("reports an adjustment and a severe pain", async () => {
    const { service } = setup();
    const result = await service.saveCheckin("user-1", { ...INPUT, pains: [{ bodyRegion: "knees", intensity: "severe" }] });
    expect(result).toEqual({ checkinId: "checkin-1", needsAdjustment: true, hasSeverePain: true });
  });

  it("compares the available time with the latest assessment", async () => {
    await expect(setup(90).service.saveCheckin("user-1", INPUT)).resolves.toMatchObject({ needsAdjustment: true });
    await expect(setup(null).service.saveCheckin("user-1", { ...INPUT, availableMinutes: 20 })).resolves.toMatchObject({ needsAdjustment: false });
  });

  it("rejects input outside the schema", async () => {
    const { service, readinessRepository } = setup();
    await expect(service.saveCheckin("user-1", { ...INPUT, sleepQuality: "great" })).rejects.toBeInstanceOf(InvalidInputError);
    expect(readinessRepository.saveCheckin).not.toHaveBeenCalled();
  });

  it("rejects a workout outside the user's active plan", async () => {
    const { service, readinessRepository } = setup();
    await expect(service.saveCheckin("user-1", { ...INPUT, workoutId: OTHER_WORKOUT_ID })).rejects.toBeInstanceOf(NotFoundError);
    expect(readinessRepository.saveCheckin).not.toHaveBeenCalled();
  });
});
