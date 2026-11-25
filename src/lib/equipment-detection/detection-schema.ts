import { z } from "zod";
import { DETECTION_CONFIDENCES, MAX_DETECTION_PHOTOS } from "@/lib/constants/equipment-detection";

/** Structured output asked from Claude: plain fields only (converts to JSON Schema). */
export const aiEquipmentDetectionSchema = z.object({
  equipment: z.array(z.object({
    slug: z.string().min(1).describe("Slug copied exactly from the equipment list"),
    confidence: z.enum(DETECTION_CONFIDENCES).describe("How sure you are that this equipment is in the photos"),
    photoNumbers: z.array(z.number().int()).min(1).describe("Numbers of the photos where it appears"),
  })),
});
export type AiEquipmentDetection = z.infer<typeof aiEquipmentDetectionSchema>;

/** One identified equipment, as POST /api/equipment-detections returns it (step 4.1). */
export const detectedEquipmentSchema = z.object({
  slug: z.string(),
  name: z.string(),
  confidence: z.enum(DETECTION_CONFIDENCES),
  photoNumbers: z.array(z.number().int().min(1).max(MAX_DETECTION_PHOTOS)).min(1),
});
export type DetectedEquipment = z.infer<typeof detectedEquipmentSchema>;

export const equipmentDetectionResultSchema = z.object({ equipment: z.array(detectedEquipmentSchema) });
export type EquipmentDetectionResult = z.infer<typeof equipmentDetectionResultSchema>;
