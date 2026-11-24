import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "./plan-repository";
import { createSupabaseWorkoutEditRepository } from "./workout-edit-repository";
import { createWorkoutEditService, type WorkoutEditService } from "./workout-edit-service";

/** Composition root for manual workout editing on the server. */
export async function createServerWorkoutEditService(): Promise<WorkoutEditService> {
  const supabase = await createServerSupabaseClient();
  return createWorkoutEditService(createSupabasePlanRepository(supabase), createSupabaseWorkoutEditRepository(supabase));
}
