import { CATALOG_SOURCES, type CatalogSource } from "@/lib/catalog/catalog-sources";
import type { ExerciseDifficulty } from "@/lib/catalog/exercises/exercise-types";
import { translate, type TranslationKey } from "@/lib/i18n/translate";

const SOURCE_LABEL_KEYS: Record<CatalogSource, TranslationKey> = {
  [CATALOG_SOURCES.workoutFreeVideos]: "catalog.sources.workoutFreeVideos",
  [CATALOG_SOURCES.freeExerciseDb]: "catalog.sources.freeExerciseDb",
  [CATALOG_SOURCES.exerciseLibrary]: "catalog.sources.exerciseLibrary",
};

const LICENSE_LABEL_KEYS: Record<string, TranslationKey> = {
  "CC0-1.0": "catalog.licenses.cc0",
  unverified: "catalog.licenses.unverified",
};

function isCatalogSource(source: string): source is CatalogSource {
  return source in SOURCE_LABEL_KEYS;
}

export function describeDifficulty(difficulty: ExerciseDifficulty): string {
  return translate(`catalog.difficulty.${difficulty}`);
}

export function describeSource(source: string): string {
  return isCatalogSource(source) ? translate(SOURCE_LABEL_KEYS[source]) : source;
}

export function describeLicense(license: string): string {
  const key = LICENSE_LABEL_KEYS[license];
  return key ? translate(key) : license;
}
