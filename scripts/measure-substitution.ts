// Makes one real substitution call to the Claude API (step 3B.4) with the app's filter, ranking, prompt and
// validation, and prints time, tokens, cost and the choice. Nothing is saved.
// Usage: ANTHROPIC_API_KEY=... npx tsx scripts/measure-substitution.ts <options.json> [reason] [effort]
// options.json = output of list_substitution_candidates (original + candidates).
import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { CLAUDE_EFFORTS, CLAUDE_MODEL } from "../src/lib/constants/ai";
import { MAX_SUBSTITUTION_CANDIDATES_FOR_AI, SUBSTITUTION_EFFORT, SUBSTITUTION_OPERATION, SUBSTITUTION_REASONS } from "../src/lib/constants/substitution";
import { createStructuredOutputClient } from "../src/lib/integrations/claude/structured-output-client";
import { createLogger } from "../src/lib/logger/logger";
import { buildSubstitutionPrompt, SUBSTITUTION_SYSTEM_PROMPT } from "../src/lib/substitution/substitution-prompt";
import { filterCandidates, findSuggestionIssues, rankCandidates } from "../src/lib/substitution/substitution-rules";
import { aiSubstitutionSchema } from "../src/lib/substitution/substitution-schema";
import { computeCostUsd, readUsage } from "./lib/claude-usage";

const profileSchema = z.object({ slug: z.string(), primary_muscles: z.array(z.string()), secondary_muscles: z.array(z.string()), equipment: z.array(z.string()) });
const optionsSchema = z.object({ original: profileSchema, candidates: z.array(profileSchema) });
/** Sample prescription; no personal data. */
const SAMPLE_PRESCRIPTION = { sets: 3, repsMin: 10, repsMax: 10 };

function toProfile(row: z.infer<typeof profileSchema>) {
  return { slug: row.slug, primaryMuscles: row.primary_muscles, secondaryMuscles: row.secondary_muscles, equipment: row.equipment };
}

async function main() {
  const [optionsPath, reasonArgument, effortArgument] = process.argv.slice(2);
  if (!optionsPath) throw new Error("usage: measure-substitution.ts <options.json> [reason] [effort]");
  const reason = z.enum(SUBSTITUTION_REASONS).parse(reasonArgument ?? "equipment_busy");
  const effort = z.enum(CLAUDE_EFFORTS).parse(effortArgument ?? SUBSTITUTION_EFFORT);
  const options = optionsSchema.parse(JSON.parse(await readFile(optionsPath, "utf8")));
  const original = toProfile(options.original);
  const ranked = rankCandidates(filterCandidates(options.candidates.map(toProfile), { original, reason, excludedSlugs: new Set([original.slug]) }), original);
  const candidates = ranked.slice(0, MAX_SUBSTITUTION_CANDIDATES_FOR_AI);
  const logLines: string[] = [];
  const logger = createLogger({ minimumLevel: "info", writer: (line) => logLines.push(line) });
  const client = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const output = await createStructuredOutputClient({ client, logger }).generate({
    operation: SUBSTITUTION_OPERATION,
    system: SUBSTITUTION_SYSTEM_PROMPT,
    prompt: buildSubstitutionPrompt({ original, prescription: SAMPLE_PRESCRIPTION, reason, limitations: null, candidates }),
    schema: aiSubstitutionSchema,
    effort,
  });
  const usage = readUsage(logLines);
  const issues = findSuggestionIssues(output, new Set(candidates.map((candidate) => candidate.slug)));
  const costUsd = Number(computeCostUsd(usage, CLAUDE_MODEL).toFixed(5));
  console.log(JSON.stringify({ model: CLAUDE_MODEL, effort, reason, filtered: ranked.length, sent: candidates.length, ...usage, costUsd, issues, output }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exitCode = 1;
});
