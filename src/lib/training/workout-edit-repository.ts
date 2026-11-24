import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError, RepositoryError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { EditedExercise } from "./workout-edit-schema";

export interface WorkoutEditRepository {
  /** Replaces the workout's exercise list atomically (kept items updated, missing deleted, new inserted). */
  saveWorkoutExercises(workoutId: string, exercises: readonly EditedExercise[]): Promise<void>;
}

/** SQLSTATEs raised by save_workout_exercises. */
const WORKOUT_NOT_FOUND_CODE = "WK002";
const EXERCISES_MISMATCH_CODE = "22023";

function toRows(exercises: readonly EditedExercise[]) {
  return exercises.map((exercise) => ({
    id: exercise.id,
    exercise_slug: exercise.exerciseSlug,
    category: exercise.category,
    sets: exercise.sets,
    reps_min: exercise.repsMin,
    reps_max: exercise.repsMax,
    rest_seconds: exercise.restSeconds,
    notes: exercise.notes,
  }));
}

/** Writes through the user's Supabase session (RLS applies inside the function). */
export function createSupabaseWorkoutEditRepository(client: SupabaseClient): WorkoutEditRepository {
  return {
    async saveWorkoutExercises(workoutId, exercises) {
      const { error } = await client.rpc("save_workout_exercises", { p_workout_id: workoutId, p_exercises: toRows(exercises) });
      if (!error) return;
      if (error.code === WORKOUT_NOT_FOUND_CODE) throw new NotFoundError(translate("errors.notFound", { resource: translate("training.workoutResource") }));
      if (error.code === EXERCISES_MISMATCH_CODE) throw new UnprocessableError(translate("planEdit.exercisesMismatch"));
      throw new RepositoryError(translate("errors.internal"), "workouts.saveWorkoutExercises");
    },
  };
}
