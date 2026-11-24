import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { findAiAdjustmentIssues, findChangeIssues, resolveAiChanges, selectReplacementCandidates } from "./adjustment-rules";
import type { AdjustmentChange, AiDailyAdjustment } from "./adjustment-schema";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const WORKOUT = buildWorkout("A", 1, [
  buildWorkoutExercise(1, { id: FIRST_ID, sets: 4, repsMin: 8, repsMax: 12 }),
  buildWorkoutExercise(2, { id: SECOND_ID, sets: 3, repsMin: 10, repsMax: 10 }),
]);
const CANDIDATES = new Set(["goblet-squat", "fake-exercise-2"]);
const RULES = { workout: WORKOUT, candidateSlugs: CANDIDATES };

function change(overrides: Partial<AdjustmentChange>): AdjustmentChange {
  return { workoutExerciseId: FIRST_ID, changeType: "reduced", replacementSlug: null, sets: 2, repsMin: 8, repsMax: 10, reason: "Dia leve", ...overrides };
}

function aiChange(overrides: Partial<AiDailyAdjustment["changes"][number]>): AiDailyAdjustment["changes"][number] {
  return { exerciseSlug: "fake-exercise-1", changeType: "reduced", replacementSlug: null, sets: 2, repsMin: null, repsMax: null, reason: "Dia leve", ...overrides };
}

describe("resolveAiChanges", () => {
  it("maps slugs to prescriptions and fills null sets or reps with the plan", () => {
    const result = resolveAiChanges({ summary: "s", estimatedMinutes: 30, changes: [aiChange({}), aiChange({ exerciseSlug: "fake-exercise-2", changeType: "removed", sets: 1 })] }, WORKOUT);
    expect(result.issues).toEqual([]);
    expect(result.changes).toEqual([
      change({ sets: 2, repsMin: 8, repsMax: 12 }),
      change({ workoutExerciseId: SECOND_ID, changeType: "removed", sets: null, repsMin: null, repsMax: null }),
    ]);
  });

  it("reports exercises outside today's workout", () => {
    expect(resolveAiChanges({ summary: "s", estimatedMinutes: 30, changes: [aiChange({ exerciseSlug: "other" })] }, WORKOUT).issues).toEqual(["unknown_exercise"]);
  });
});

describe("findChangeIssues", () => {
  it("accepts lighter prescriptions, removals and replacements from the list", () => {
    expect(findChangeIssues([change({}), change({ workoutExerciseId: SECOND_ID, changeType: "replaced", replacementSlug: "goblet-squat", sets: 3, repsMin: 10, repsMax: 10 })], RULES)).toEqual([]);
    expect(findChangeIssues([change({ changeType: "removed", sets: null, repsMin: null, repsMax: null })], RULES)).toEqual([]);
    expect(findChangeIssues([], RULES)).toEqual([]);
  });

  it("never allows more sets or reps than the plan", () => {
    expect(findChangeIssues([change({ sets: 5 })], RULES)).toContain("above_plan");
    expect(findChangeIssues([change({ repsMin: 9 })], RULES)).toContain("above_plan");
    expect(findChangeIssues([change({ repsMax: 13 })], RULES)).toContain("above_plan");
  });

  it("rejects a reduction that changes nothing or an inverted range", () => {
    expect(findChangeIssues([change({ sets: 4, repsMin: 8, repsMax: 12 })], RULES)).toContain("no_change");
    expect(findChangeIssues([change({ repsMin: 8, repsMax: 6 })], RULES)).toContain("invalid_rep_range");
  });

  it("rejects replacements outside the list, already in the workout or repeated", () => {
    const replaced = (slug: string, id = FIRST_ID) => change({ workoutExerciseId: id, changeType: "replaced", replacementSlug: slug, sets: 3, repsMin: 8, repsMax: 10 });
    expect(findChangeIssues([replaced("unknown")], RULES)).toContain("unknown_replacement");
    expect(findChangeIssues([replaced("fake-exercise-2")], RULES)).toContain("replacement_in_workout");
    expect(findChangeIssues([replaced("goblet-squat"), { ...replaced("goblet-squat", SECOND_ID), sets: 2, repsMin: 10, repsMax: 10 }], RULES)).toContain("duplicate_replacement");
    expect(findChangeIssues([change({ replacementSlug: "goblet-squat" })], RULES)).toContain("invalid_change");
  });

  it("rejects removals with a prescription, unknown or repeated prescriptions, and an empty workout", () => {
    expect(findChangeIssues([change({ changeType: "removed" })], RULES)).toContain("invalid_change");
    expect(findChangeIssues([change({ workoutExerciseId: "33333333-3333-4333-8333-333333333333" })], RULES)).toContain("unknown_exercise");
    expect(findChangeIssues([change({}), change({ sets: 1 })], RULES)).toContain("duplicate_exercise");
    const removed = (id: string) => change({ workoutExerciseId: id, changeType: "removed", sets: null, repsMin: null, repsMax: null });
    expect(findChangeIssues([removed(FIRST_ID), removed(SECOND_ID)], RULES)).toContain("empty_workout");
  });
});

describe("findAiAdjustmentIssues", () => {
  it("requires the estimate to fit in the available time", () => {
    const adjustment = { summary: "s", estimatedMinutes: 40, changes: [aiChange({})] };
    expect(findAiAdjustmentIssues(adjustment, { ...RULES, availableMinutes: 45 })).toEqual([]);
    expect(findAiAdjustmentIssues(adjustment, { ...RULES, availableMinutes: 30 })).toEqual(["over_time"]);
  });
});

describe("selectReplacementCandidates", () => {
  it("keeps exercises sharing a primary muscle with the workout and outside it", () => {
    const profiles = [{ slug: "fake-exercise-1", primaryMuscles: ["quadriceps"], equipment: ["dumbbell"] }];
    const candidates = [
      { slug: "fake-exercise-1", primaryMuscles: ["quadriceps"], equipment: ["dumbbell"] },
      { slug: "goblet-squat", primaryMuscles: ["glutes", "quadriceps"], equipment: ["dumbbell"] },
      { slug: "curl", primaryMuscles: ["biceps"], equipment: ["dumbbell"] },
    ];
    expect(selectReplacementCandidates(candidates, profiles).map((candidate) => candidate.slug)).toEqual(["goblet-squat"]);
  });
});
