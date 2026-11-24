// Makes one real plan-generation call to the Claude API and prints time, tokens and cost (PLN-001).
// Usage: ANTHROPIC_API_KEY=... npx tsx scripts/measure-plan-generation.ts <candidates.json> [effort] [model]
// candidates.json = output of list_plan_candidates (slug, primary_muscles, equipment). Nothing is saved.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SavedAssessment } from "../src/lib/assessment/assessment-schema";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { CLAUDE_EFFORTS, CLAUDE_MODEL } from "../src/lib/constants/ai";
import { PLAN_GENERATION_EFFORT, PLAN_GENERATION_OPERATION } from "../src/lib/constants/plan-generation";
import { createStructuredOutputClient } from "../src/lib/integrations/claude/structured-output-client";
import { createLogger } from "../src/lib/logger/logger";
import { generatedPlanSchema } from "../src/lib/plan-generation/generated-plan-schema";
import { findGeneratedPlanIssues } from "../src/lib/plan-generation/generated-plan-validation";
import { buildPlanRequestPrompt, buildPlanSystemPrompt } from "../src/lib/plan-generation/plan-prompt";
import { resolveWorkoutCountRange } from "../src/lib/plan-generation/split-rule";
import { computeCostUsd, readCatalogRows, readUsage } from "./lib/claude-usage";

/** Typical answers of a new user; no personal data. */
const SAMPLE_ASSESSMENT: SavedAssessment = {
  id: "00000000-0000-0000-0000-000000000000",
  createdAt: new Date().toISOString(),
  goal: "hypertrophy",
  experienceLevel: "intermediate",
  daysPerWeek: 4,
  sessionMinutes: 60,
  splitPreference: "ai_decides",
  equipmentSlugs: [],
  limitations: "Dor leve no ombro direito em movimentos acima da cabeça.",
};

async function main() {
  const [candidatesPath, effortArgument, modelArgument] = process.argv.slice(2);
  const model = modelArgument ?? CLAUDE_MODEL;
  if (!candidatesPath) throw new Error("usage: measure-plan-generation.ts <candidates.json> [effort]");
  const effort = z.enum(CLAUDE_EFFORTS).parse(effortArgument ?? PLAN_GENERATION_EFFORT);
  const candidates = await readCatalogRows(candidatesPath);
  const logLines: string[] = [];
  const logger = createLogger({ minimumLevel: "info", writer: (line) => logLines.push(line) });
  const client = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const range = resolveWorkoutCountRange(SAMPLE_ASSESSMENT);
  const plan = await createStructuredOutputClient({ client, logger }).generate({
    operation: PLAN_GENERATION_OPERATION,
    system: buildPlanSystemPrompt(candidates),
    prompt: buildPlanRequestPrompt(SAMPLE_ASSESSMENT, range),
    schema: generatedPlanSchema,
    model,
    effort,
    cacheSystem: true,
  });
  const usage = readUsage(logLines);
  const issues = findGeneratedPlanIssues(plan, { candidateSlugs: new Set(candidates.map((candidate) => candidate.slug)), workoutCountRange: range });
  console.log(JSON.stringify({ model, effort, candidates: candidates.length, ...usage, costUsd: Number(computeCostUsd(usage, model).toFixed(4)), issues, plan }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exitCode = 1;
});
