import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { buildSuggestedLoads, collectTrackedExerciseIds } from "./suggested-loads";

const TRACKED = buildWorkoutExercise(1, { sets: 3, trackProgression: true });
const UNTRACKED = buildWorkoutExercise(2, { sets: 2, trackProgression: false });
const WORKOUTS = [buildWorkout("A", 1, [TRACKED, UNTRACKED])];

describe("suggested loads", () => {
  it("collects catalog exercise ids of tracked exercises only, without repetition", () => {
    const twice = [...WORKOUTS, buildWorkout("B", 2, [buildWorkoutExercise(1, { id: "other", trackProgression: true })])];
    expect(collectTrackedExerciseIds(twice)).toEqual(["exercise-1"]);
  });

  it("uses the load of the same set number, falling back to the last logged set", () => {
    const latest = [
      { exerciseId: "exercise-1", setNumber: 1, loadKg: 20 },
      { exerciseId: "exercise-1", setNumber: 2, loadKg: 22.5 },
      { exerciseId: "exercise-2", setNumber: 1, loadKg: 50 },
    ];
    expect(buildSuggestedLoads(WORKOUTS, latest)).toEqual({ [TRACKED.id]: [20, 22.5, 22.5] });
  });

  it("suggests nothing without history", () => {
    expect(buildSuggestedLoads(WORKOUTS, [])).toEqual({});
  });
});
