import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { buildLoadAdjustments, computeDecreasedLoad, computeIncreasedLoad } from "./load-adjustments";

const TRACKED = buildWorkoutExercise(1, { sets: 3, repsMin: 8, repsMax: 12, trackProgression: true });
const WORKOUTS = [buildWorkout("A", 1, [TRACKED])];
const EXERCISE_ID = TRACKED.exercise.id;

type Effort = "easy" | "ok" | "max" | null;

function logs(entries: Array<[number, number, number | null, Effort?]>) {
  return entries.map(([setNumber, loadKg, repsDone, effort = null]) => ({ exerciseId: EXERCISE_ID, setNumber, loadKg, repsDone, effort }));
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

describe("computeDecreasedLoad", () => {
  it.each([
    [30, 28.5],
    [20, 19],
    [100, 95],
    [8, 7],
    [0.5, 0],
  ])("%s kg goes to %s kg", (from, to) => {
    expect(computeDecreasedLoad(from)).toBe(to);
  });
});

describe("buildLoadAdjustments", () => {
  it("suggests more load when every prescribed set reached the top of the range at the same load", () => {
    expect(buildLoadAdjustments(WORKOUTS, logs([[1, 20, 12], [2, 20, 12], [3, 20, 13]]))).toEqual({
      [TRACKED.id]: { kind: "increase", fromKg: 20, toKg: 21, reps: 12 },
    });
  });

  it.each([
    ["a set below the top of the range", logs([[1, 20, 12], [2, 20, 11], [3, 20, 12]])],
    ["fewer sets than prescribed", logs([[1, 20, 12], [2, 20, 12]])],
    ["different loads", logs([[1, 20, 12], [2, 22.5, 12], [3, 20, 12]])],
    ["missing reps", logs([[1, 20, 12], [2, 20, null], [3, 20, 12]])],
    ["no load (bodyweight)", logs([[1, 0, 12], [2, 0, 12], [3, 0, 12]])],
  ])("keeps the load with %s", (_, latest) => {
    expect(buildLoadAdjustments(WORKOUTS, latest)).toEqual({});
  });

  it("keeps the load when a set was at the limit, even at the top of the range (step 3B.3)", () => {
    expect(buildLoadAdjustments(WORKOUTS, logs([[1, 20, 12, "ok"], [2, 20, 12, "max"], [3, 20, 12]]))).toEqual({
      [TRACKED.id]: { kind: "hold", loadKg: 20 },
    });
  });

  it("still raises the load when sets were easy or ok", () => {
    expect(buildLoadAdjustments(WORKOUTS, logs([[1, 20, 12, "easy"], [2, 20, 12, "ok"], [3, 20, 12, "easy"]]))).toMatchObject({
      [TRACKED.id]: { kind: "increase", toKg: 21 },
    });
  });

  it("lowers the load after 2 or more sets at the limit below the minimum reps", () => {
    expect(buildLoadAdjustments(WORKOUTS, logs([[1, 30, 8, "ok"], [2, 30, 7, "max"], [3, 27.5, 6, "max"]]))).toEqual({
      [TRACKED.id]: { kind: "decrease", fromKg: 30, toKg: 28.5, maxEffortSets: 2, repsMin: 8 },
    });
  });

  it.each([
    ["only one set at the limit below the minimum", logs([[1, 30, 8], [2, 30, 7, "max"], [3, 30, 8]])],
    ["sets at the limit but within the range", logs([[1, 30, 8, "max"], [2, 30, 9, "max"], [3, 30, 8]])],
    ["no effort marked (only the step 3.5 rule)", logs([[1, 30, 6], [2, 30, 6], [3, 30, 6]])],
  ])("does not lower the load with %s", (_, latest) => {
    expect(buildLoadAdjustments(WORKOUTS, latest)).toEqual({});
  });

  it("ignores exercises whose progression is not tracked", () => {
    const untracked = [buildWorkout("A", 1, [{ ...TRACKED, trackProgression: false }])];
    expect(buildLoadAdjustments(untracked, logs([[1, 20, 12], [2, 20, 12], [3, 20, 12]]))).toEqual({});
    expect(buildLoadAdjustments(untracked, logs([[1, 30, 6, "max"], [2, 30, 6, "max"], [3, 30, 6]]))).toEqual({});
  });
});
