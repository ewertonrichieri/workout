import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { buildLoadIncreases, computeIncreasedLoad } from "./load-increases";

const TRACKED = buildWorkoutExercise(1, { sets: 3, repsMin: 8, repsMax: 12, trackProgression: true });
const WORKOUTS = [buildWorkout("A", 1, [TRACKED])];
const EXERCISE_ID = TRACKED.exercise.id;

function logs(entries: Array<[number, number, number | null]>) {
  return entries.map(([setNumber, loadKg, repsDone]) => ({ exerciseId: EXERCISE_ID, setNumber, loadKg, repsDone }));
}

describe("computeIncreasedLoad", () => {
  it.each([
    [20, 21],
    [50, 52.5],
    [100, 105],
    [8, 9],
    [31, 32.5],
  ])("%s kg goes to %s kg", (from, to) => {
    expect(computeIncreasedLoad(from)).toBe(to);
  });
});

describe("buildLoadIncreases", () => {
  it("suggests more load when every prescribed set reached the top of the range at the same load", () => {
    expect(buildLoadIncreases(WORKOUTS, logs([[1, 20, 12], [2, 20, 12], [3, 20, 13]]))).toEqual({
      [TRACKED.id]: { fromKg: 20, toKg: 21, reps: 12 },
    });
  });

  it.each([
    ["a set below the top of the range", logs([[1, 20, 12], [2, 20, 11], [3, 20, 12]])],
    ["fewer sets than prescribed", logs([[1, 20, 12], [2, 20, 12]])],
    ["different loads", logs([[1, 20, 12], [2, 22.5, 12], [3, 20, 12]])],
    ["missing reps", logs([[1, 20, 12], [2, 20, null], [3, 20, 12]])],
    ["no load (bodyweight)", logs([[1, 0, 12], [2, 0, 12], [3, 0, 12]])],
  ])("keeps the load with %s", (_, latest) => {
    expect(buildLoadIncreases(WORKOUTS, latest)).toEqual({});
  });

  it("ignores exercises whose progression is not tracked", () => {
    const untracked = [buildWorkout("A", 1, [{ ...TRACKED, trackProgression: false }])];
    expect(buildLoadIncreases(untracked, logs([[1, 20, 12], [2, 20, 12], [3, 20, 12]]))).toEqual({});
  });
});
