// Makes one real equipment detection call to the Claude API (step 4.1) with the app's photo validation, prompt and
// sanitizing, and prints time, tokens, cost and the answer. Nothing is saved; the photos only pass through memory.
// Usage: ANTHROPIC_API_KEY=... npx tsx scripts/measure-equipment-detection.ts [--effort=low] <photo> [photo...]
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { CLAUDE_EFFORTS, CLAUDE_MODEL } from "../src/lib/constants/ai";
import { EQUIPMENT_DETECTION_EFFORT, EQUIPMENT_DETECTION_OPERATION } from "../src/lib/constants/equipment-detection";
import { buildDetectionPrompt, buildPhotoLabel, EQUIPMENT_DETECTION_SYSTEM_PROMPT } from "../src/lib/equipment-detection/detection-prompt";
import { sanitizeDetection } from "../src/lib/equipment-detection/detection-rules";
import { aiEquipmentDetectionSchema } from "../src/lib/equipment-detection/detection-schema";
import { readDetectionPhotos } from "../src/lib/equipment-detection/photo-validation";
import { createStructuredOutputClient } from "../src/lib/integrations/claude/structured-output-client";
import { createLogger } from "../src/lib/logger/logger";
import { computeCostUsd, readUsage } from "./lib/claude-usage";

const VOCABULARY_PATH = "seed-data/catalog/vocabulary/equipment.json";
const EFFORT_PREFIX = "--effort=";
const vocabularySchema = z.object({ entries: z.array(z.object({ slug: z.string(), namePt: z.string() })) });

/** Same vocabulary the seed puts in the equipment table (slug + pt-BR name). */
async function readVocabulary() {
  const { entries } = vocabularySchema.parse(JSON.parse(await readFile(VOCABULARY_PATH, "utf8")));
  return entries.map((entry) => ({ slug: entry.slug, name: entry.namePt }));
}

function parseArguments(argumentsList: readonly string[]) {
  const effortArgument = argumentsList.find((argument) => argument.startsWith(EFFORT_PREFIX))?.slice(EFFORT_PREFIX.length);
  const paths = argumentsList.filter((argument) => !argument.startsWith(EFFORT_PREFIX));
  if (paths.length === 0) throw new Error("usage: measure-equipment-detection.ts [--effort=low] <photo> [photo...]");
  return { paths, effort: z.enum(CLAUDE_EFFORTS).parse(effortArgument ?? EQUIPMENT_DETECTION_EFFORT) };
}

async function main() {
  const { paths, effort } = parseArguments(process.argv.slice(2));
  const files = await Promise.all(paths.map(async (path) => new File([await readFile(path)], basename(path))));
  const photos = await readDetectionPhotos(files);
  const vocabulary = await readVocabulary();
  const logLines: string[] = [];
  const logger = createLogger({ minimumLevel: "info", writer: (line) => logLines.push(line) });
  const client = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const output = await createStructuredOutputClient({ client, logger }).generate({
    operation: EQUIPMENT_DETECTION_OPERATION,
    system: EQUIPMENT_DETECTION_SYSTEM_PROMPT,
    prompt: buildDetectionPrompt(vocabulary, photos.length),
    images: photos.map((photo, index) => ({ label: buildPhotoLabel(index + 1), ...photo })),
    schema: aiEquipmentDetectionSchema,
    effort,
  });
  const usage = readUsage(logLines);
  const costUsd = Number(computeCostUsd(usage, CLAUDE_MODEL).toFixed(5));
  const photoNames = paths.map((path, index) => `${index + 1}: ${basename(path)}`);
  console.log(JSON.stringify({ model: CLAUDE_MODEL, effort, photoNames, ...usage, costUsd, ...sanitizeDetection(output, vocabulary, photos.length), raw: output }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exitCode = 1;
});
