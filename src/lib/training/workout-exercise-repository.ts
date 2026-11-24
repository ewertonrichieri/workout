import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

export interface WorkoutExerciseRepository {
  updateTrackProgression(workoutExerciseId: string, trackProgression: boolean): Promise<void>;
}

/** Only `track_progression` is updatable by the app role (column grant); RLS keeps rows to the owner. */
export function createSupabaseWorkoutExerciseRepository(client: SupabaseClient): WorkoutExerciseRepository {
  return {
    async updateTrackProgression(workoutExerciseId, trackProgression) {
      const { error } = await client.from("workout_exercises").update({ track_progression: trackProgression }).eq("id", workoutExerciseId);
      if (error) throw new RepositoryError(translate("errors.internal"), "workoutExercises.updateTrackProgression");
    },
  };
}
