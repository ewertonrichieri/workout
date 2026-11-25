import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import { DETECTION_CONFIDENCES, type DetectionConfidence } from "@/lib/constants/equipment-detection";
import { ALWAYS_AVAILABLE_EQUIPMENT } from "@/lib/constants/substitution";
import type { AiEquipmentDetection, DetectedEquipment } from "./detection-schema";

/** Metadata for the logs: never the photos or the answer. */
export type DetectionIssue = "unknown_slug" | "invalid_photo_number" | "no_valid_photo";

export interface SanitizedDetection {
  equipment: DetectedEquipment[];
  issues: DetectionIssue[];
}

type AiItem = AiEquipmentDetection["equipment"][number];

const CONFIDENCE_RANK = new Map<DetectionConfidence, number>(DETECTION_CONFIDENCES.map((confidence, index) => [confidence, index]));

function rankOf(confidence: DetectionConfidence): number {
  return CONFIDENCE_RANK.get(confidence) ?? DETECTION_CONFIDENCES.length;
}

function validPhotoNumbers(numbers: readonly number[], photoCount: number): number[] {
  return [...new Set(numbers.filter((number) => number >= 1 && number <= photoCount))].sort((first, second) => first - second);
}

function mergeItem(merged: Map<string, DetectedEquipment>, item: DetectedEquipment): void {
  const previous = merged.get(item.slug);
  if (!previous) return void merged.set(item.slug, item);
  const confidence = rankOf(item.confidence) < rankOf(previous.confidence) ? item.confidence : previous.confidence;
  const photoNumbers = [...new Set([...previous.photoNumbers, ...item.photoNumbers])].sort((first, second) => first - second);
  merged.set(item.slug, { ...previous, confidence, photoNumbers });
}

function compareDetected(first: DetectedEquipment, second: DetectedEquipment): number {
  return rankOf(first.confidence) - rankOf(second.confidence) || first.name.localeCompare(second.name, "pt-BR");
}

/**
 * Keeps only vocabulary equipment seen in the photos that were sent (a false positive is worse than a miss).
 * Bodyweight is always available, so it is never taken from the photos.
 */
export function sanitizeDetection(output: AiEquipmentDetection, vocabulary: readonly CatalogTerm[], photoCount: number): SanitizedDetection {
  const names = new Map(vocabulary.map((term) => [term.slug, term.name]));
  const issues = new Set<DetectionIssue>();
  const merged = new Map<string, DetectedEquipment>();
  output.equipment.forEach((item: AiItem) => {
    const name = names.get(item.slug);
    if (item.slug === ALWAYS_AVAILABLE_EQUIPMENT) return;
    if (!name) return void issues.add("unknown_slug");
    const photoNumbers = validPhotoNumbers(item.photoNumbers, photoCount);
    if (photoNumbers.length < item.photoNumbers.length) issues.add("invalid_photo_number");
    if (photoNumbers.length === 0) return void issues.add("no_valid_photo");
    mergeItem(merged, { slug: item.slug, name, confidence: item.confidence, photoNumbers });
  });
  return { equipment: [...merged.values()].sort(compareDetected), issues: [...issues] };
}
