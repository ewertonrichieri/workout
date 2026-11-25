import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import {
  FULL_GYM_EXCLUDED_EQUIPMENT,
  PRESELECTED_CONFIDENCES,
  PRESET_EQUIPMENT,
  type DetectionConfidence,
  type EquipmentPreset,
} from "@/lib/constants/equipment-detection";
import { ALWAYS_AVAILABLE_EQUIPMENT } from "@/lib/constants/substitution";
import type { DetectedEquipment } from "./detection-schema";

/** One line of the review (step 4.2); bodyweight has no confidence: it is always available. */
export interface ReviewItem {
  slug: string;
  name: string;
  confidence: DetectionConfidence | null;
  photoNumbers: number[];
  isChecked: boolean;
}

/** Decision D5, limited to the catalog and in catalog order. */
export function resolvePresetSlugs(preset: EquipmentPreset, vocabularySlugs: readonly string[]): string[] {
  if (preset === "full_gym") return vocabularySlugs.filter((slug) => !FULL_GYM_EXCLUDED_EQUIPMENT.includes(slug));
  const presetSlugs = new Set(PRESET_EQUIPMENT[preset]);
  return vocabularySlugs.filter((slug) => presetSlugs.has(slug));
}

/** Decision D4: high and medium come checked, low unchecked ("Talvez"); bodyweight is added, checked. */
export function buildReviewItems(detected: readonly DetectedEquipment[], vocabulary: readonly CatalogTerm[]): ReviewItem[] {
  if (detected.length === 0) return [];
  const items = detected.map((item) => ({ ...item, isChecked: PRESELECTED_CONFIDENCES.includes(item.confidence) }));
  const bodyweight = vocabulary.find((term) => term.slug === ALWAYS_AVAILABLE_EQUIPMENT);
  if (!bodyweight) return items;
  return [...items, { slug: bodyweight.slug, name: bodyweight.name, confidence: null, photoNumbers: [], isChecked: true }];
}
