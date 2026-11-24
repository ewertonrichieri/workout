import "server-only";
import { createSupabaseAssessmentRepository } from "@/lib/assessment/assessment-repository";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerStructuredOutputClient } from "@/lib/integrations/claude/server-claude-client";
import { createSupabaseAdjustmentRepository } from "@/lib/readiness/adjustment-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "@/lib/training/plan-repository";
import { createSupabaseSubstitutionRepository } from "./substitution-repository";
import { createSubstitutionService, type SubstitutionService } from "./substitution-service";

/** Composition root for the exercise substitution on the spot (step 3B.4). */
export async function createServerSubstitutionService(): Promise<SubstitutionService> {
  const supabase = await createServerSupabaseClient();
  return createSubstitutionService({
    planRepository: createSupabasePlanRepository(supabase),
    assessmentRepository: createSupabaseAssessmentRepository(supabase),
    substitutionRepository: createSupabaseSubstitutionRepository(supabase),
    exerciseSource: createSupabaseAdjustmentRepository(supabase),
    structuredOutputClient: createServerStructuredOutputClient(),
    logger: createServerLogger(),
  });
}
