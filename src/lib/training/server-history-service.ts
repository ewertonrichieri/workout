import "server-only";
import { createSupabaseExerciseRepository } from "@/lib/catalog/exercises/exercise-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabaseHistoryRepository } from "./history-repository";
import { createHistoryService, type HistoryService } from "./history-service";

/** Composition root for the workout history on the server (catalog repository as the exercise lookup). */
export async function createServerHistoryService(): Promise<HistoryService> {
  const supabase = await createServerSupabaseClient();
  return createHistoryService(createSupabaseHistoryRepository(supabase), createSupabaseExerciseRepository(supabase));
}
