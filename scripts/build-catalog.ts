// Builds the unified catalog (normalization, deduplication, pt-BR names) from the parsed sources.
// Usage: npm run catalog:build
// Inputs and outputs live under seed-data/catalog/ (see docs/specs/009-catalogo-exercicios.md).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { CATALOG_SOURCE_VALUES } from "../src/lib/catalog/catalog-sources";
import { buildCatalog, type CatalogBuildInput, type CatalogBuildResult } from "../src/lib/catalog/normalization/build-catalog";
import { duplicateDecisionsSchema } from "../src/lib/catalog/normalization/deduplicate-exercises";
import { vocabularySchema } from "../src/lib/catalog/normalization/vocabulary";
import { sourceExerciseSchema } from "../src/lib/catalog/source-exercise";
import { createLogger } from "../src/lib/logger/logger";

const CATALOG_DIRECTORY = join(process.cwd(), "seed-data", "catalog");
const JSON_INDENT = 2;
const PATHS = {
  sources: join(CATALOG_DIRECTORY, "sources"),
  muscles: join(CATALOG_DIRECTORY, "vocabulary", "muscles.json"),
  equipment: join(CATALOG_DIRECTORY, "vocabulary", "equipment.json"),
  translations: join(CATALOG_DIRECTORY, "translations", "exercise-names.pt-BR.json"),
  decisions: join(CATALOG_DIRECTORY, "curation", "duplicate-decisions.json"),
  catalog: join(CATALOG_DIRECTORY, "catalog.json"),
  reviewCandidates: join(CATALOG_DIRECTORY, "review", "duplicate-candidates.json"),
  untranslated: join(CATALOG_DIRECTORY, "review", "untranslated-names.json"),
};

const logger = createLogger({ minimumLevel: "info" });

async function readJson<Output>(path: string, schema: z.ZodType<Output>): Promise<Output> {
  return schema.parse(JSON.parse(await readFile(path, "utf8")) as unknown);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, JSON_INDENT)}\n`, "utf8");
}

async function readInput(): Promise<CatalogBuildInput> {
  const sourceLists = await Promise.all(
    CATALOG_SOURCE_VALUES.map((source) => readJson(join(PATHS.sources, `${source}.json`), z.array(sourceExerciseSchema))),
  );
  return {
    sourceExercises: sourceLists.flat(),
    muscleVocabulary: await readJson(PATHS.muscles, vocabularySchema),
    equipmentVocabulary: await readJson(PATHS.equipment, vocabularySchema),
    nameTranslations: await readJson(PATHS.translations, z.record(z.string(), z.string().trim().min(1))),
    duplicateDecisions: await readJson(PATHS.decisions, duplicateDecisionsSchema),
  };
}

function reportProblems(result: CatalogBuildResult): boolean {
  result.unmappedTerms.forEach((term) => logger.error("unmapped vocabulary term", { ...term }));
  result.unusedTranslationSlugs.forEach((slug) => logger.error("translation for unknown slug", { slug }));
  return result.unmappedTerms.length > 0 || result.unusedTranslationSlugs.length > 0;
}

async function main(): Promise<void> {
  const input = await readInput();
  const result = buildCatalog(input);
  if (reportProblems(result)) {
    process.exitCode = 1;
    return;
  }
  await writeJson(PATHS.catalog, result.exercises);
  await writeJson(PATHS.reviewCandidates, result.reviewCandidates);
  await writeJson(PATHS.untranslated, result.untranslatedSlugs);
  logger.info("catalog built", {
    sourceExercises: input.sourceExercises.length,
    exercises: result.exercises.length,
    reviewCandidates: result.reviewCandidates.length,
    untranslated: result.untranslatedSlugs.length,
  });
}

main().catch((error: unknown) => {
  logger.error("catalog build failed", { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
