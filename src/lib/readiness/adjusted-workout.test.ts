import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { ProposedChange } from "./adjustment-schema";
import { adjustWorkoutForDay, omitPrescriptions } from "./adjusted-workout";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const THIRD_ID = "33333333-3333-4333-8333-333333333333";
const WORKOUT = buildWorkout("A", 1, [
  buildWorkoutExercise(1, { id: FIRST_ID, sets: 4 }),
  buildWorkoutExercise(2, { id: SECOND_ID }),
  buildWorkoutExercise(3, { id: THIRD_ID }),
]);
const GOBLET = { id: "55555555-5555-4555-8555-555555555555", slug: "goblet-squat", name: "Agachamento goblet", coverMedia: null, media: [] };
const CHANGES: ProposedChange[] = [
  { workoutExerciseId: FIRST_ID, changeType: "reduced", replacementSlug: null, sets: 2, repsMin: 8, repsMax: 10, reason: "Dormiu mal", replacement: null },
  { workoutExerciseId: SECOND_ID, changeType: "removed", replacementSlug: null, sets: null, repsMin: null, repsMax: null, reason: "Joelho", replacement: null },
  { workoutExerciseId: THIRD_ID, changeType: "replaced", replacementSlug: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12, reason: "Poupa o joelho", replacement: GOBLET },
];
const PROPOSAL = { checkinId: "44444444-4444-4444-8444-444444444444", summary: "Mais leve.", estimatedMinutes: 30, changes: CHANGES };
const DONE = { status: "done" as const, checkinId: PROPOSAL.checkinId, needsAdjustment: true, hasSeverePain: false };

describe("adjustWorkoutForDay", () => {
  it("keeps the plan without an accepted adjustment", () => {
    expect(adjustWorkoutForDay(WORKOUT, null).workout).toBe(WORKOUT);
    expect(adjustWorkoutForDay(WORKOUT, { status: "skipped" }).workout).toBe(WORKOUT);
    expect(adjustWorkoutForDay(WORKOUT, { ...DONE, adjustment: { status: "proposed", proposal: PROPOSAL } }).workout).toBe(WORKOUT);
    expect(adjustWorkoutForDay(WORKOUT, { ...DONE, adjustment: { status: "declined" } }).changedIds.size).toBe(0);
  });

  it("applies an accepted adjustment: lighter prescription, removed and replaced exercises", () => {
    const { workout, changedIds } = adjustWorkoutForDay(WORKOUT, { ...DONE, adjustment: { status: "accepted", proposal: PROPOSAL } });
    expect(workout.id).toBe(WORKOUT.id);
    expect(workout.exercises.map((item) => item.id)).toEqual([FIRST_ID, THIRD_ID]);
    expect(workout.exercises[0]).toMatchObject({ sets: 2, repsMin: 8, repsMax: 10, dailyChange: { changeType: "reduced", reason: "Dormiu mal", originalName: null } });
    expect(workout.exercises[1]).toMatchObject({
      exercise: GOBLET,
      sets: 3,
      trackProgression: false,
      dailyChange: { changeType: "replaced", reason: "Poupa o joelho", originalName: "Exercício falso 3" },
    });
    expect([...changedIds]).toEqual([SECOND_ID, THIRD_ID]);
  });
});

describe("omitPrescriptions", () => {
  it("drops suggestions of removed or replaced prescriptions", () => {
    expect(omitPrescriptions({ [FIRST_ID]: [20], [THIRD_ID]: [10] }, new Set([THIRD_ID]))).toEqual({ [FIRST_ID]: [20] });
  });
});
