import type { AiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import type { EquipmentSource } from "@/lib/assessment/assessment-service";
import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import { EQUIPMENT_DETECTION_EFFORT, EQUIPMENT_DETECTION_OPERATION } from "@/lib/constants/equipment-detection";
import { UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import { buildDetectionPrompt, buildPhotoLabel, EQUIPMENT_DETECTION_SYSTEM_PROMPT } from "./detection-prompt";
import { sanitizeDetection } from "./detection-rules";
import { aiEquipmentDetectionSchema, type EquipmentDetectionResult } from "./detection-schema";
import { readDetectionPhotos, type DetectionPhoto } from "./photo-validation";

export interface EquipmentDetectionServiceDependencies {
  equipmentSource: EquipmentSource;
  aiUsageGuard: AiUsageGuard;
  structuredOutputClient: StructuredOutputClient;
  logger: Logger;
}

export interface EquipmentDetectionService {
  /** Identifies vocabulary equipment in 1 to 5 photos (step 4.1). Nothing is saved: the user reviews the list. */
  detectEquipment(photoEntries: readonly unknown[]): Promise<EquipmentDetectionResult>;
}

async function loadVocabulary(equipmentSource: EquipmentSource): Promise<CatalogTerm[]> {
  const vocabulary = await equipmentSource.listEquipment();
  if (vocabulary.length === 0) throw new UnprocessableError(translate("assessment.noEquipmentDescription"));
  return vocabulary;
}

function askAi(client: StructuredOutputClient, photos: readonly DetectionPhoto[], vocabulary: readonly CatalogTerm[]) {
  return client.generate({
    operation: EQUIPMENT_DETECTION_OPERATION,
    system: EQUIPMENT_DETECTION_SYSTEM_PROMPT,
    prompt: buildDetectionPrompt(vocabulary, photos.length),
    images: photos.map((photo, index) => ({ label: buildPhotoLabel(index + 1), ...photo })),
    schema: aiEquipmentDetectionSchema,
    effort: EQUIPMENT_DETECTION_EFFORT,
  });
}

export function createEquipmentDetectionService(dependencies: EquipmentDetectionServiceDependencies): EquipmentDetectionService {
  return {
    async detectEquipment(photoEntries) {
      const photos = await readDetectionPhotos(photoEntries);
      const vocabulary = await loadVocabulary(dependencies.equipmentSource);
      await dependencies.aiUsageGuard.reserve(EQUIPMENT_DETECTION_OPERATION);
      const output = await askAi(dependencies.structuredOutputClient, photos, vocabulary);
      const { equipment, issues } = sanitizeDetection(output, vocabulary, photos.length);
      if (issues.length > 0) dependencies.logger.warn("equipment detection items dropped", { operation: EQUIPMENT_DETECTION_OPERATION, issues });
      dependencies.logger.info("equipment detected", { operation: EQUIPMENT_DETECTION_OPERATION, photoCount: photos.length, equipmentCount: equipment.length });
      return { equipment };
    },
  };
}
