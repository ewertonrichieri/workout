import "server-only";
import { createSupabaseExerciseRepository } from "@/lib/catalog/exercises/exercise-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabaseAssessmentRepository } from "./assessment-repository";
import { createAssessmentService, type AssessmentService } from "./assessment-service";

/** Composition root for the assessment on the server. */
export async function createServerAssessmentService(): Promise<AssessmentService> {
  const supabase = await createServerSupabaseClient();
  return createAssessmentService(createSupabaseAssessmentRepository(supabase), createSupabaseExerciseRepository(supabase));
}
