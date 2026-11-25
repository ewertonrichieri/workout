import "server-only";
import { createAiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import { createSupabaseAiUsageRepository } from "@/lib/ai-usage/ai-usage-repository";
import { createSupabaseAssessmentRepository } from "@/lib/assessment/assessment-repository";
import { createSupabaseExerciseRepository } from "@/lib/catalog/exercises/exercise-repository";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerStructuredOutputClient } from "@/lib/integrations/claude/server-claude-client";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabaseTechniqueAnalysisRepository } from "./technique-analysis-repository";
import { createTechniqueAnalysisService, type TechniqueAnalysisService } from "./technique-analysis-service";

/** Composition root for the AI analysis after the set (step 5.4). */
export async function createServerTechniqueAnalysisService(): Promise<TechniqueAnalysisService> {
  const supabase = await createServerSupabaseClient();
  const logger = createServerLogger();
  const assessmentRepository = createSupabaseAssessmentRepository(supabase);
  return createTechniqueAnalysisService({
    exerciseSource: createSupabaseExerciseRepository(supabase),
    limitationsSource: {
      hasLimitations: async (userId) => Boolean((await assessmentRepository.findLatestAssessment(userId))?.limitations?.trim()),
    },
    aiUsageGuard: createAiUsageGuard({ repository: createSupabaseAiUsageRepository(supabase), logger }),
    structuredOutputClient: createServerStructuredOutputClient(),
    analysisRepository: createSupabaseTechniqueAnalysisRepository(supabase),
    logger,
  });
}
