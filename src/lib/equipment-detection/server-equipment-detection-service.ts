import "server-only";
import { createAiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import { createSupabaseAiUsageRepository } from "@/lib/ai-usage/ai-usage-repository";
import { createSupabaseExerciseRepository } from "@/lib/catalog/exercises/exercise-repository";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerStructuredOutputClient } from "@/lib/integrations/claude/server-claude-client";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createEquipmentDetectionService, type EquipmentDetectionService } from "./equipment-detection-service";

/** Composition root for the equipment detection from photos (step 4.1). */
export async function createServerEquipmentDetectionService(): Promise<EquipmentDetectionService> {
  const supabase = await createServerSupabaseClient();
  const logger = createServerLogger();
  return createEquipmentDetectionService({
    equipmentSource: createSupabaseExerciseRepository(supabase),
    aiUsageGuard: createAiUsageGuard({ repository: createSupabaseAiUsageRepository(supabase), logger }),
    structuredOutputClient: createServerStructuredOutputClient(),
    logger,
  });
}
