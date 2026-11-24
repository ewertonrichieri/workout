import "server-only";
import { createAiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import { createSupabaseAiUsageRepository } from "@/lib/ai-usage/ai-usage-repository";
import { createSupabaseAssessmentRepository } from "@/lib/assessment/assessment-repository";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerStructuredOutputClient } from "@/lib/integrations/claude/server-claude-client";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "@/lib/training/plan-repository";
import { createSupabasePlanGenerationRepository } from "./plan-generation-repository";
import { createPlanGenerationService, type PlanGenerationService } from "./plan-generation-service";

/** Composition root for plan generation on the server. */
export async function createServerPlanGenerationService(): Promise<PlanGenerationService> {
  const supabase = await createServerSupabaseClient();
  const logger = createServerLogger();
  return createPlanGenerationService({
    assessmentRepository: createSupabaseAssessmentRepository(supabase),
    planRepository: createSupabasePlanRepository(supabase),
    generationRepository: createSupabasePlanGenerationRepository(supabase),
    structuredOutputClient: createServerStructuredOutputClient(),
    aiUsageGuard: createAiUsageGuard({ repository: createSupabaseAiUsageRepository(supabase), logger }),
    logger,
    now: () => new Date(),
  });
}
