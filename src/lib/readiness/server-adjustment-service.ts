import "server-only";
import { createAiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import { createSupabaseAiUsageRepository } from "@/lib/ai-usage/ai-usage-repository";
import { createSupabaseAssessmentRepository } from "@/lib/assessment/assessment-repository";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerStructuredOutputClient } from "@/lib/integrations/claude/server-claude-client";
import { createSupabasePlanGenerationRepository } from "@/lib/plan-generation/plan-generation-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabasePlanRepository } from "@/lib/training/plan-repository";
import { createSupabaseAdjustmentRepository } from "./adjustment-repository";
import { createAdjustmentService, type AdjustmentService } from "./adjustment-service";

/** Composition root for the daily adjustment by AI on the server (step 3B.2). */
export async function createServerAdjustmentService(): Promise<AdjustmentService> {
  const supabase = await createServerSupabaseClient();
  const logger = createServerLogger();
  return createAdjustmentService({
    adjustmentRepository: createSupabaseAdjustmentRepository(supabase),
    planRepository: createSupabasePlanRepository(supabase),
    assessmentRepository: createSupabaseAssessmentRepository(supabase),
    candidateSource: createSupabasePlanGenerationRepository(supabase),
    structuredOutputClient: createServerStructuredOutputClient(),
    aiUsageGuard: createAiUsageGuard({ repository: createSupabaseAiUsageRepository(supabase), logger }),
    logger,
    now: () => new Date(),
  });
}
