import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createExerciseCatalogService, type ExerciseCatalogService } from "./exercise-catalog-service";
import { createSupabaseExerciseRepository } from "./exercise-repository";

/** Composition root for the exercise catalog on the server. */
export async function createServerExerciseCatalogService(): Promise<ExerciseCatalogService> {
  const supabase = await createServerSupabaseClient();
  return createExerciseCatalogService(createSupabaseExerciseRepository(supabase));
}
