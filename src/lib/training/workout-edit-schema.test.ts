import { describe, expect, it } from "vitest";
import { editedExerciseSchema, workoutEditInputSchema } from "./workout-edit-schema";

const ITEM = { id: null, exerciseSlug: "goblet-squat", category: " Principal ", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60, notes: "" };

describe("workout edit schema", () => {
  it("accepts an item, trimming texts and turning empty ones into null", () => {
    expect(editedExerciseSchema.parse(ITEM)).toEqual({ ...ITEM, category: "Principal", notes: null });
  });

  it.each([
    ["an invalid id", { id: "x" }],
    ["an invalid slug", { exerciseSlug: "Not A Slug" }],
    ["zero sets", { sets: 0 }],
    ["eleven sets", { sets: 11 }],
    ["fifty-one reps", { repsMax: 51 }],
    ["max below min", { repsMin: 12, repsMax: 8 }],
    ["too long rest", { restSeconds: 601 }],
    ["too long category", { category: "a".repeat(41) }],
    ["too long notes", { notes: "a".repeat(301) }],
  ])("rejects %s", (_, override) => {
    expect(editedExerciseSchema.safeParse({ ...ITEM, ...override }).success).toBe(false);
  });

  it("points the inverted range at repsMax", () => {
    const result = editedExerciseSchema.safeParse({ ...ITEM, repsMin: 12, repsMax: 8 });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))).toEqual(["repsMax"]);
  });

  it("needs 1 to 12 exercises", () => {
    expect(workoutEditInputSchema.safeParse({ exercises: [] }).success).toBe(false);
    expect(workoutEditInputSchema.safeParse({ exercises: Array.from({ length: 13 }, (_, index) => ({ ...ITEM, exerciseSlug: `ex-${index}` })) }).success).toBe(false);
    expect(workoutEditInputSchema.safeParse({ exercises: [ITEM] }).success).toBe(true);
  });
});
