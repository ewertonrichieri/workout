import "server-only";
import { createSupabaseAssessmentRepository } from "@/lib/assessment/assessment-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "@/lib/training/plan-repository";
import { createSupabaseReadinessRepository } from "./readiness-repository";
import { createReadinessService, type ReadinessService } from "./readiness-service";

/** Composition root for the pre-workout check-in on the server. */
export async function createServerReadinessService(): Promise<ReadinessService> {
  const supabase = await createServerSupabaseClient();
  const assessmentRepository = createSupabaseAssessmentRepository(supabase);
  return createReadinessService({
    planRepository: createSupabasePlanRepository(supabase),
    readinessRepository: createSupabaseReadinessRepository(supabase),
    sessionMinutesSource: {
      findLatestSessionMinutes: async (userId) => (await assessmentRepository.findLatestAssessment(userId))?.sessionMinutes ?? null,
    },
  });
}
