import {
  MAX_SET_EFFORT,
  MIN_MAX_EFFORT_SETS_FOR_DECREASE,
  PROGRESSION_DECREASE_RATIO,
  PROGRESSION_INCREASE_RATIO,
  PROGRESSION_MIN_DECREASE_KG,
  PROGRESSION_MIN_INCREASE_KG,
  PROGRESSION_ROUNDING_KG,
} from "@/lib/constants/training";
import type { Workout, WorkoutExercise } from "./plan-types";
import type { LatestSetLoad } from "./suggested-loads";

/** Load change of a tracked exercise and why (steps 3.5 and 3B.3, decision D5). */
export type LoadAdjustment =
  /** Every set at the top of the range with the same load, none at the limit: +5%. */
  | { kind: "increase"; fromKg: number; toKg: number; reps: number }
  /** 2+ sets marked "no limite" below the minimum reps: −5%. */
  | { kind: "decrease"; fromKg: number; toKg: number; maxEffortSets: number; repsMin: number }
  /** Would go up, but a set was marked "no limite": the load stays. */
  | { kind: "hold"; loadKg: number };

/** Keyed by workout exercise id; only exercises whose load changes or holds for a stated reason. */
export type LoadAdjustments = Record<string, LoadAdjustment>;

function roundToStep(value: number): number {
  return Math.round(value / PROGRESSION_ROUNDING_KG) * PROGRESSION_ROUNDING_KG;
}

/** +5% rounded to 0.5 kg, never less than +1 kg. */
export function computeIncreasedLoad(loadKg: number): number {
  return loadKg + Math.max(roundToStep(loadKg * PROGRESSION_INCREASE_RATIO), PROGRESSION_MIN_INCREASE_KG);
}

/** −5% rounded to 0.5 kg, never less than −1 kg and never below 0. */
export function computeDecreasedLoad(loadKg: number): number {
  return Math.max(0, loadKg - Math.max(roundToStep(loadKg * PROGRESSION_DECREASE_RATIO), PROGRESSION_MIN_DECREASE_KG));
}

function findDecrease(item: WorkoutExercise, prescribed: readonly LatestSetLoad[]): LoadAdjustment | null {
  const struggled = prescribed.filter((load) => load.effort === MAX_SET_EFFORT && load.repsDone !== null && load.repsDone < item.repsMin);
  if (struggled.length < MIN_MAX_EFFORT_SETS_FOR_DECREASE) return null;
  const fromKg = Math.max(...struggled.map((load) => load.loadKg));
  if (fromKg <= 0) return null;
  return { kind: "decrease", fromKg, toKg: computeDecreasedLoad(fromKg), maxEffortSets: struggled.length, repsMin: item.repsMin };
}

/** Step 3.5: every prescribed set logged, all at the same load (> 0) and at the top of the range or above. */
function findIncrease(item: WorkoutExercise, prescribed: readonly LatestSetLoad[]): LoadAdjustment | null {
  if (prescribed.length < item.sets) return null;
  const fromKg = prescribed[0].loadKg;
  const isSameLoad = prescribed.every((load) => load.loadKg === fromKg);
  const reachedTop = prescribed.every((load) => load.repsDone !== null && load.repsDone >= item.repsMax);
  if (fromKg <= 0 || !isSameLoad || !reachedTop) return null;
  if (prescribed.some((load) => load.effort === MAX_SET_EFFORT)) return { kind: "hold", loadKg: fromKg };
  return { kind: "increase", fromKg, toKg: computeIncreasedLoad(fromKg), reps: item.repsMax };
}

function findAdjustment(item: WorkoutExercise, loads: readonly LatestSetLoad[]): LoadAdjustment | null {
  const prescribed = loads.filter((load) => load.setNumber <= item.sets);
  return findDecrease(item, prescribed) ?? findIncrease(item, prescribed);
}

/** Only exercises with "Salvar carga para progredir" on: switching it off locks the load (D5, item 5). */
export function buildLoadAdjustments(workouts: readonly Workout[], latest: readonly LatestSetLoad[]): LoadAdjustments {
  const adjustments: LoadAdjustments = {};
  for (const item of workouts.flatMap((workout) => workout.exercises)) {
    if (!item.trackProgression) continue;
    const adjustment = findAdjustment(item, latest.filter((load) => load.exerciseId === item.exercise.id));
    if (adjustment) adjustments[item.id] = adjustment;
  }
  return adjustments;
}
