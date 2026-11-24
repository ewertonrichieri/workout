import { ACCESSORY_EQUIPMENT_SLUGS } from "../catalog-sources";
import type { SourceExercise } from "../source-exercise";
import { buildNameMatchKey, stripMediaQualifiers } from "./text-normalization";
import { mapTerms, type VocabularyIndex } from "./vocabulary";

const EQUIPMENT_KEY_SEPARATOR = "+";

export interface CatalogVocabularies {
  muscles: VocabularyIndex;
  equipment: VocabularyIndex;
}

export interface UnmappedTerm {
  kind: "muscle" | "equipment";
  term: string;
  refKey: string;
}

export interface NormalizedExercise {
  refKey: string;
  sourceExercise: SourceExercise;
  displayNameEn: string;
  nameKey: string;
  aliasKeys: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  /** Canonical equipment used for matching (accessories left out), sorted and joined. */
  equipmentKey: string;
}

export interface NormalizationResult {
  exercise: NormalizedExercise;
  unmappedTerms: UnmappedTerm[];
}

export function buildRefKey(exercise: Pick<SourceExercise, "source" | "externalId">): string {
  return `${exercise.source}:${exercise.externalId}`;
}

function buildEquipmentKey(equipment: readonly string[]): string {
  const distinctive = equipment.filter((slug) => !ACCESSORY_EQUIPMENT_SLUGS.has(slug));
  const keyEquipment = distinctive.length > 0 ? distinctive : [...equipment];
  return keyEquipment.sort().join(EQUIPMENT_KEY_SEPARATOR);
}

function toUnmappedTerms(kind: UnmappedTerm["kind"], terms: string[], refKey: string): UnmappedTerm[] {
  return terms.map((term) => ({ kind, term, refKey }));
}

/** Maps one source exercise to canonical vocabulary and builds its matching keys. */
export function normalizeSourceExercise(source: SourceExercise, vocabularies: CatalogVocabularies): NormalizationResult {
  const refKey = buildRefKey(source);
  const primary = mapTerms(vocabularies.muscles, source.primaryMuscles);
  const secondary = mapTerms(vocabularies.muscles, source.secondaryMuscles);
  const equipment = mapTerms(vocabularies.equipment, source.equipment);
  const exercise: NormalizedExercise = {
    refKey,
    sourceExercise: source,
    displayNameEn: stripMediaQualifiers(source.nameEn),
    nameKey: buildNameMatchKey(source.nameEn),
    aliasKeys: source.aliases.map(buildNameMatchKey),
    primaryMuscles: primary.slugs,
    secondaryMuscles: secondary.slugs.filter((slug) => !primary.slugs.includes(slug)),
    equipment: equipment.slugs,
    equipmentKey: buildEquipmentKey(equipment.slugs),
  };
  const unmappedTerms = [
    ...toUnmappedTerms("muscle", [...primary.unmapped, ...secondary.unmapped], refKey),
    ...toUnmappedTerms("equipment", equipment.unmapped, refKey),
  ];
  return { exercise, unmappedTerms };
}
