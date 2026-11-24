import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { groupExercisesByCategory, selectWorkout } from "./workout-display";

describe("selectWorkout", () => {
  const workouts = [buildWorkout("A", 1), buildWorkout("B", 2), buildWorkout("C", 3)];

  it("picks the workout with the requested label", () => {
    expect(selectWorkout(workouts, "B")?.label).toBe("B");
  });

  it("falls back to the first workout when the label is missing or unknown", () => {
    expect(selectWorkout(workouts, undefined)?.label).toBe("A");
    expect(selectWorkout(workouts, "Z")?.label).toBe("A");
  });

  it("returns null when the plan has no workouts", () => {
    expect(selectWorkout([], "A")).toBeNull();
  });
});

describe("groupExercisesByCategory", () => {
  it("groups by category in order of first appearance, keeping exercise order", () => {
    const exercises = [
      buildWorkoutExercise(1, { category: "Neuromuscular" }),
      buildWorkoutExercise(2, { category: "Força" }),
      buildWorkoutExercise(3, { category: "Neuromuscular" }),
      buildWorkoutExercise(4, { category: null }),
    ];
    const groups = groupExercisesByCategory(exercises);
    expect(groups.map((group) => group.category)).toEqual(["Neuromuscular", "Força", null]);
    expect(groups[0].exercises.map((exercise) => exercise.position)).toEqual([1, 3]);
    expect(groups[2].exercises.map((exercise) => exercise.position)).toEqual([4]);
  });

  it("returns no groups for a workout without exercises", () => {
    expect(groupExercisesByCategory([])).toEqual([]);
  });
});
