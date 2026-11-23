// Parses the local clones of the catalog sources into versioned files under seed-data/catalog/sources/.
// Usage: npm run catalog:parse -- --free-exercise-db <dir> --workout-free-videos <dir> --exercise-library <dir>
// Any source left out is skipped.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { CATALOG_SOURCES, type CatalogSource } from "../src/lib/catalog/catalog-sources";
import { parseExerciseLibrary } from "../src/lib/catalog/parsers/exercise-library-parser";
import { parseFreeExerciseDb } from "../src/lib/catalog/parsers/free-exercise-db-parser";
import type { ParsedSource } from "../src/lib/catalog/parsers/parse-source-items";
import { parseWorkoutFreeVideos } from "../src/lib/catalog/parsers/workout-free-videos-parser";
import { createLogger } from "../src/lib/logger/logger";

const OUTPUT_DIRECTORY = join(process.cwd(), "seed-data", "catalog", "sources");
const JSON_INDENT = 2;

interface SourceDefinition {
  source: CatalogSource;
  optionName: string;
  dataFile: string;
  parse: (rawSource: unknown) => ParsedSource;
}

const SOURCE_DEFINITIONS: SourceDefinition[] = [
  { source: CATALOG_SOURCES.freeExerciseDb, optionName: "free-exercise-db", dataFile: "data/exercises.json", parse: parseFreeExerciseDb },
  { source: CATALOG_SOURCES.workoutFreeVideos, optionName: "workout-free-videos", dataFile: "data/exercises.json", parse: parseWorkoutFreeVideos },
  { source: CATALOG_SOURCES.exerciseLibrary, optionName: "exercise-library", dataFile: "exercises.json", parse: parseExerciseLibrary },
];

const logger = createLogger({ minimumLevel: "info" });

async function parseOneSource(definition: SourceDefinition, inputDirectory: string): Promise<void> {
  const rawText = await readFile(join(inputDirectory, definition.dataFile), "utf8");
  const parsed = definition.parse(JSON.parse(rawText) as unknown);
  const exercises = [...parsed.exercises].sort((left, right) => left.externalId.localeCompare(right.externalId));
  const outputPath = join(OUTPUT_DIRECTORY, `${definition.source}.json`);
  await writeFile(outputPath, `${JSON.stringify(exercises, null, JSON_INDENT)}\n`, "utf8");
  logger.info("catalog source parsed", { source: definition.source, exercises: exercises.length, rejected: parsed.rejected.length });
  parsed.rejected.forEach((item) => logger.warn("catalog item rejected", { source: definition.source, ...item }));
}

async function main(): Promise<void> {
  const options = Object.fromEntries(SOURCE_DEFINITIONS.map(({ optionName }) => [optionName, { type: "string" as const }]));
  const { values } = parseArgs({ options });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  for (const definition of SOURCE_DEFINITIONS) {
    const inputDirectory = values[definition.optionName];
    if (typeof inputDirectory === "string") await parseOneSource(definition, inputDirectory);
  }
}

main().catch((error: unknown) => {
  logger.error("catalog parsing failed", { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
