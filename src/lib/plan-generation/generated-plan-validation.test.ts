import { describe, expect, it } from "vitest";
import type { GeneratedPlan } from "./generated-plan-schema";
import { generatedPlanSchema } from "./generated-plan-schema";
import { findGeneratedPlanIssues } from "./generated-plan-validation";

function buildExercise(exerciseSlug: string, overrides: Partial<GeneratedPlan["workouts"][number]["exercises"][number]> = {}) {
  return { exerciseSlug, category: "Principal", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60, notes: null, ...overrides };
}

const CANDIDATES = new Set(["squat", "bench-press", "row"]);
const RANGE = { min: 2, max: 3 };

function buildPlan(workouts: GeneratedPlan["workouts"]): GeneratedPlan {
  return { workouts };
}

const VALID_PLAN = buildPlan([
  { label: "A", exercises: [buildExercise("squat"), buildExercise("bench-press")] },
  { label: "B", exercises: [buildExercise("row")] },
]);

describe("generated plan schema", () => {
  it("accepts a well-formed plan", () => {
    expect(generatedPlanSchema.safeParse(VALID_PLAN).success).toBe(true);
  });

  it.each([
    ["zero sets", { sets: 0 }],
    ["too many sets", { sets: 11 }],
    ["too many reps", { repsMax: 51 }],
    ["negative rest", { restSeconds: -1 }],
    ["too long notes", { notes: "a".repeat(301) }],
  ])("rejects %s", (_, override) => {
    const plan = buildPlan([{ label: "A", exercises: [buildExercise("squat", override)] }]);
    expect(generatedPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects an empty workout or more than 12 exercises", () => {
    expect(generatedPlanSchema.safeParse(buildPlan([{ label: "A", exercises: [] }])).success).toBe(false);
    const crowded = Array.from({ length: 13 }, (_, index) => buildExercise(`exercise-${index}`));
    expect(generatedPlanSchema.safeParse(buildPlan([{ label: "A", exercises: crowded }])).success).toBe(false);
  });
});

describe("findGeneratedPlanIssues", () => {
  it("accepts a plan that follows every rule", () => {
    expect(findGeneratedPlanIssues(VALID_PLAN, { candidateSlugs: CANDIDATES, workoutCountRange: RANGE })).toEqual([]);
  });

  it("flags exercises outside the candidate list", () => {
    const plan = buildPlan([{ label: "A", exercises: [buildExercise("laser-curl")] }, VALID_PLAN.workouts[1]]);
    expect(findGeneratedPlanIssues(plan, { candidateSlugs: CANDIDATES, workoutCountRange: RANGE })).toEqual(["unknown_exercise"]);
  });

  it("flags a workout count outside the split rule", () => {
    expect(findGeneratedPlanIssues(buildPlan([VALID_PLAN.workouts[0]]), { candidateSlugs: CANDIDATES, workoutCountRange: RANGE })).toEqual(["workout_count"]);
  });

  it("flags repeated labels, repeated exercises in a workout and inverted rep ranges", () => {
    const plan = buildPlan([
      { label: "A", exercises: [buildExercise("squat"), buildExercise("squat", { repsMin: 12, repsMax: 8 })] },
      { label: "a", exercises: [buildExercise("row")] },
    ]);
    expect(findGeneratedPlanIssues(plan, { candidateSlugs: CANDIDATES, workoutCountRange: RANGE })).toEqual([
      "duplicate_label",
      "duplicate_exercise",
      "invalid_rep_range",
    ]);
  });
});
