import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "./plan-repository";
import { createSupabaseWorkoutExerciseRepository } from "./workout-exercise-repository";
import { createWorkoutExerciseService, type WorkoutExerciseService } from "./workout-exercise-service";

/** Composition root for workout exercise updates on the server. */
export async function createServerWorkoutExerciseService(): Promise<WorkoutExerciseService> {
  const supabase = await createServerSupabaseClient();
  return createWorkoutExerciseService(createSupabasePlanRepository(supabase), createSupabaseWorkoutExerciseRepository(supabase));
}
