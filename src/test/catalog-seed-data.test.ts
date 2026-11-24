import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CATALOG_SOURCE_VALUES } from "@/lib/catalog/catalog-sources";
import { buildCatalog } from "@/lib/catalog/normalization/build-catalog";
import { duplicateDecisionsSchema } from "@/lib/catalog/normalization/deduplicate-exercises";
import { vocabularySchema } from "@/lib/catalog/normalization/vocabulary";
import { sourceExerciseSchema } from "@/lib/catalog/source-exercise";

const CATALOG_DIRECTORY = join(process.cwd(), "seed-data", "catalog");

function readJson<Output>(relativePath: string, schema: z.ZodType<Output>): Output {
  return schema.parse(JSON.parse(readFileSync(join(CATALOG_DIRECTORY, relativePath), "utf8")) as unknown);
}

/** Guards the curated, versioned catalog files (vocabulary, translations, decisions) against drift. */
describe("versioned catalog seed data", () => {
  const result = buildCatalog({
    sourceExercises: CATALOG_SOURCE_VALUES.flatMap((source) =>
      readJson(`sources/${source}.json`, z.array(sourceExerciseSchema)),
    ),
    muscleVocabulary: readJson("vocabulary/muscles.json", vocabularySchema),
    equipmentVocabulary: readJson("vocabulary/equipment.json", vocabularySchema),
    nameTranslations: readJson("translations/exercise-names.pt-BR.json", z.record(z.string(), z.string())),
    duplicateDecisions: readJson("curation/duplicate-decisions.json", duplicateDecisionsSchema),
  });

  it("maps every source muscle and equipment term", () => {
    expect(result.unmappedTerms).toEqual([]);
  });

  it("has no translation for a slug that no longer exists", () => {
    expect(result.unusedTranslationSlugs).toEqual([]);
  });

  it("translates every exercise that has a video", () => {
    const untranslatedWithVideo = result.exercises.filter(
      (exercise) => exercise.namePt === null && exercise.media.some((media) => media.mediaType === "video"),
    );
    expect(untranslatedWithVideo.map((exercise) => exercise.slug)).toEqual([]);
  });

  it("matches the committed catalog output", () => {
    const committed: unknown = JSON.parse(readFileSync(join(CATALOG_DIRECTORY, "catalog.json"), "utf8"));
    expect(result.exercises).toEqual(committed);
  });
});
