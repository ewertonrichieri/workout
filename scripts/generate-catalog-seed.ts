// Generates supabase/seed.sql (idempotent catalog seed) from the versioned files in seed-data/catalog/.
// Usage: npm run catalog:seed — then apply with admin credentials (see docs/specs/009-catalogo-exercicios.md).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { catalogExerciseSchema } from "../src/lib/catalog/catalog-exercise";
import { mediaHostingSchema } from "../src/lib/catalog/media/media-hosting";
import { vocabularySchema } from "../src/lib/catalog/normalization/vocabulary";
import { buildCatalogSeedSql } from "../src/lib/catalog/seed/build-catalog-seed-sql";
import { createLogger } from "../src/lib/logger/logger";

const CATALOG_DIRECTORY = join(process.cwd(), "seed-data", "catalog");
const SEED_PATH = join(process.cwd(), "supabase", "seed.sql");

const logger = createLogger({ minimumLevel: "info" });

async function readJson<Output>(relativePath: string, schema: z.ZodType<Output>): Promise<Output> {
  return schema.parse(JSON.parse(await readFile(join(CATALOG_DIRECTORY, relativePath), "utf8")) as unknown);
}

async function main(): Promise<void> {
  const exercises = await readJson("catalog.json", z.array(catalogExerciseSchema));
  const sql = buildCatalogSeedSql({
    exercises,
    muscles: (await readJson("vocabulary/muscles.json", vocabularySchema)).entries,
    equipment: (await readJson("vocabulary/equipment.json", vocabularySchema)).entries,
    mediaHosting: await readJson("media-hosting.json", mediaHostingSchema),
  });
  await writeFile(SEED_PATH, sql, "utf8");
  logger.info("catalog seed generated", { exercises: exercises.length, bytes: Buffer.byteLength(sql) });
}

main().catch((error: unknown) => {
  logger.error("catalog seed generation failed", { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
