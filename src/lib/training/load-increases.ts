import { PROGRESSION_INCREASE_RATIO, PROGRESSION_MIN_INCREASE_KG, PROGRESSION_ROUNDING_KG } from "@/lib/constants/training";
import type { Workout, WorkoutExercise } from "./plan-types";
import type { LatestSetLoad } from "./suggested-loads";

/** Why and how much to raise the load of a tracked exercise (step 3.5). */
export interface LoadIncrease {
  fromKg: number;
  toKg: number;
  /** Top of the prescribed range, reached in every set. */
  reps: number;
}

/** Keyed by workout exercise id; only exercises that earned an increase. */
export type LoadIncreases = Record<string, LoadIncrease>;

function roundToStep(value: number): number {
  return Math.round(value / PROGRESSION_ROUNDING_KG) * PROGRESSION_ROUNDING_KG;
}

/** +5% rounded to 0.5 kg, never less than +1 kg. */
export function computeIncreasedLoad(loadKg: number): number {
  return loadKg + Math.max(roundToStep(loadKg * PROGRESSION_INCREASE_RATIO), PROGRESSION_MIN_INCREASE_KG);
}

/** Every prescribed set logged, all at the same load (> 0) and all at the top of the range or above. */
function findIncrease(item: WorkoutExercise, loads: readonly LatestSetLoad[]): LoadIncrease | null {
  const prescribed = loads.filter((load) => load.setNumber <= item.sets);
  if (prescribed.length < item.sets) return null;
  const fromKg = prescribed[0].loadKg;
  const isSameLoad = prescribed.every((load) => load.loadKg === fromKg);
  const reachedTop = prescribed.every((load) => load.repsDone !== null && load.repsDone >= item.repsMax);
  if (fromKg <= 0 || !isSameLoad || !reachedTop) return null;
  return { fromKg, toKg: computeIncreasedLoad(fromKg), reps: item.repsMax };
}

export function buildLoadIncreases(workouts: readonly Workout[], latest: readonly LatestSetLoad[]): LoadIncreases {
  const increases: LoadIncreases = {};
  for (const item of workouts.flatMap((workout) => workout.exercises)) {
    if (!item.trackProgression) continue;
    const increase = findIncrease(item, latest.filter((load) => load.exerciseId === item.exercise.id));
    if (increase) increases[item.id] = increase;
  }
  return increases;
}
