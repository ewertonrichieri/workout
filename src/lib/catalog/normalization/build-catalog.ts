import { catalogExerciseSchema, type CatalogExercise } from "../catalog-exercise";
import type { SourceExercise } from "../source-exercise";
import { deduplicateExercises, type DuplicateDecisions, type ReviewCandidate } from "./deduplicate-exercises";
import { normalizeSourceExercise, type CatalogVocabularies, type NormalizedExercise, type UnmappedTerm } from "./normalize-source-exercise";
import { toSlug } from "./text-normalization";
import { createVocabularyIndex, type Vocabulary } from "./vocabulary";

/** Curated pt-BR exercise names keyed by catalog slug. */
export type NameTranslations = Readonly<Record<string, string>>;

export interface CatalogBuildInput {
  sourceExercises: readonly SourceExercise[];
  muscleVocabulary: Vocabulary;
  equipmentVocabulary: Vocabulary;
  nameTranslations: NameTranslations;
  duplicateDecisions: DuplicateDecisions;
}

export interface CatalogBuildResult {
  exercises: CatalogExercise[];
  reviewCandidates: ReviewCandidate[];
  unmappedTerms: UnmappedTerm[];
  untranslatedSlugs: string[];
  unusedTranslationSlugs: string[];
}

export class SlugCollisionError extends Error {
  constructor(refKey: string) {
    super(`could not build a unique slug for "${refKey}"`);
    this.name = "SlugCollisionError";
  }
}

function assignSlugs(groups: readonly NormalizedExercise[][]): string[] {
  const usedSlugs = new Set<string>();
  return groups.map(([main]) => {
    const candidates = [
      toSlug(main.displayNameEn),
      toSlug(`${main.displayNameEn} ${main.equipment.join(" ")}`),
      toSlug(`${main.displayNameEn} ${main.refKey}`),
    ];
    const slug = candidates.find((candidate) => !usedSlugs.has(candidate));
    if (!slug) throw new SlugCollisionError(main.refKey);
    usedSlugs.add(slug);
    return slug;
  });
}

function mergeGroup(group: readonly NormalizedExercise[], slug: string, namePt: string | undefined): CatalogExercise {
  const [main] = group;
  const muscleSource = group.find((exercise) => exercise.primaryMuscles.length > 0) ?? main;
  const instructionSource = group.find((exercise) => exercise.sourceExercise.instructionSteps.length > 0) ?? main;
  return catalogExerciseSchema.parse({
    slug,
    nameEn: main.displayNameEn,
    namePt: namePt ?? null,
    difficulty: group.find((exercise) => exercise.sourceExercise.difficulty)?.sourceExercise.difficulty ?? null,
    instructionStepsEn: instructionSource.sourceExercise.instructionSteps,
    primaryMuscles: muscleSource.primaryMuscles,
    secondaryMuscles: muscleSource.secondaryMuscles,
    equipment: [...new Set(group.flatMap((exercise) => exercise.equipment))],
    sourceRefs: group.map(({ sourceExercise }) => ({ source: sourceExercise.source, externalId: sourceExercise.externalId })),
    media: group.flatMap(({ sourceExercise }) => sourceExercise.media.map((media) => ({ ...media, source: sourceExercise.source }))),
  });
}

function normalizeAll(input: CatalogBuildInput): { exercises: NormalizedExercise[]; unmappedTerms: UnmappedTerm[] } {
  const vocabularies: CatalogVocabularies = {
    muscles: createVocabularyIndex(input.muscleVocabulary),
    equipment: createVocabularyIndex(input.equipmentVocabulary),
  };
  const results = input.sourceExercises.map((source) => normalizeSourceExercise(source, vocabularies));
  return { exercises: results.map((result) => result.exercise), unmappedTerms: results.flatMap((result) => result.unmappedTerms) };
}

/** Normalizes, deduplicates and translates the parsed sources into the unified catalog. */
export function buildCatalog(input: CatalogBuildInput): CatalogBuildResult {
  const { exercises: normalized, unmappedTerms } = normalizeAll(input);
  const { groups, reviewCandidates } = deduplicateExercises(normalized, input.duplicateDecisions);
  const slugs = assignSlugs(groups);
  const exercises = groups.map((group, index) => mergeGroup(group, slugs[index], input.nameTranslations[slugs[index]]));
  const slugSet = new Set(slugs);
  return {
    exercises,
    reviewCandidates,
    unmappedTerms,
    untranslatedSlugs: exercises.filter((exercise) => exercise.namePt === null).map((exercise) => exercise.slug),
    unusedTranslationSlugs: Object.keys(input.nameTranslations).filter((slug) => !slugSet.has(slug)),
  };
}
