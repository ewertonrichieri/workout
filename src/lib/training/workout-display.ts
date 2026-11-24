import type { Workout, WorkoutExercise } from "./plan-types";

export interface WorkoutExerciseGroup {
  /** `null` groups exercises without category (shown without title). */
  category: string | null;
  exercises: WorkoutExercise[];
}

/** Workout chosen in the URL by label; missing or unknown label falls back to the first one. */
export function selectWorkout(workouts: readonly Workout[], requestedLabel: string | undefined): Workout | null {
  return workouts.find((workout) => workout.label === requestedLabel) ?? workouts[0] ?? null;
}

/** Groups exercises by category in order of first appearance, keeping their order inside each group. */
export function groupExercisesByCategory(exercises: readonly WorkoutExercise[]): WorkoutExerciseGroup[] {
  const groups = new Map<string | null, WorkoutExercise[]>();
  for (const exercise of exercises) {
    const group = groups.get(exercise.category) ?? [];
    group.push(exercise);
    groups.set(exercise.category, group);
  }
  return [...groups].map(([category, groupExercises]) => ({ category, exercises: groupExercises }));
}
