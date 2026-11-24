import type { SetEffort } from "@/lib/constants/training";
import type { Workout } from "./plan-types";

/** Load logged in the latest finished session of an exercise (from `latest_set_loads`). */
export interface LatestSetLoad {
  exerciseId: string;
  setNumber: number;
  loadKg: number;
  /** Reps of that set (step 3.5); null when not logged. */
  repsDone: number | null;
  /** Perceived effort of that set (step 3B.3); null when not marked. */
  effort: SetEffort | null;
}

/** Suggested load per prescribed set, keyed by workout exercise id (only tracked exercises with history). */
export type SuggestedLoads = Record<string, number[]>;

/** Catalog exercise ids whose progression is tracked in any workout of the plan. */
export function collectTrackedExerciseIds(workouts: readonly Workout[]): string[] {
  const ids = workouts.flatMap((workout) => workout.exercises.filter((item) => item.trackProgression).map((item) => item.exercise.id));
  return [...new Set(ids)];
}

function suggestForSets(loads: readonly LatestSetLoad[], prescribedSets: number): number[] {
  const bySetNumber = new Map(loads.map((load) => [load.setNumber, load.loadKg]));
  const lastLoad = loads.reduce((latest, load) => (load.setNumber > latest.setNumber ? load : latest)).loadKg;
  return Array.from({ length: prescribedSets }, (_, index) => bySetNumber.get(index + 1) ?? lastLoad);
}

/** Same set number of the latest session; sets without a log use the last logged set's load. */
export function buildSuggestedLoads(workouts: readonly Workout[], latest: readonly LatestSetLoad[]): SuggestedLoads {
  const suggestions: SuggestedLoads = {};
  for (const item of workouts.flatMap((workout) => workout.exercises)) {
    const loads = latest.filter((load) => load.exerciseId === item.exercise.id);
    if (item.trackProgression && loads.length > 0) suggestions[item.id] = suggestForSets(loads, item.sets);
  }
  return suggestions;
}
