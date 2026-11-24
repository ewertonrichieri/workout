import { describe, expect, it } from "vitest";
import { resolveWorkoutCountRange } from "./split-rule";

describe("resolveWorkoutCountRange", () => {
  it.each([1, 3, 7])("full body is always one workout (%i days)", (daysPerWeek) => {
    expect(resolveWorkoutCountRange({ splitPreference: "full_body", daysPerWeek })).toEqual({ min: 1, max: 1 });
  });

  it.each([
    [1, 2],
    [2, 2],
    [3, 3],
    [4, 4],
    [7, 5],
  ])("split with %i days allows 2 to %i workouts", (daysPerWeek, max) => {
    expect(resolveWorkoutCountRange({ splitPreference: "split", daysPerWeek })).toEqual({ min: 2, max });
  });

  it.each([
    [1, 1],
    [2, 1],
    [3, 3],
    [6, 5],
  ])("AI decides with %i days allows 1 to %i workouts", (daysPerWeek, max) => {
    expect(resolveWorkoutCountRange({ splitPreference: "ai_decides", daysPerWeek })).toEqual({ min: 1, max });
  });
});
