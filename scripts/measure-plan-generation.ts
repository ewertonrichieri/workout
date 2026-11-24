// Real Claude call for plan generation (PLN-001): time, tokens and cost. Saves nothing in the database.
// Usage: npx tsx scripts/measure-plan-generation.ts --candidates <file.json> [--effort medium] [--runs 2]
// <file.json> = the jsonb returned by list_plan_candidates (rows: slug, primary_muscles, equipment).
// Needs ANTHROPIC_API_KEY. The second run repeats the same catalog, so it shows the prompt cache.
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SavedAssessment } from "../src/lib/assessment/assessment-schema";
import { CLAUDE_EFFORTS, type ClaudeEffort } from "../src/lib/constants/ai";
import { PLAN_GENERATION_EFFORT, PLAN_GENERATION_OPERATION } from "../src/lib/constants/plan-generation";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { createStructuredOutputClient } from "../src/lib/integrations/claude/structured-output-client";
import { createLogger, type LogContext, type Logger } from "../src/lib/logger/logger";
import { generatedPlanSchema, type GeneratedPlan } from "../src/lib/plan-generation/generated-plan-schema";
import { findGeneratedPlanIssues } from "../src/lib/plan-generation/generated-plan-validation";
import type { PlanCandidate } from "../src/lib/plan-generation/plan-candidate";
import { buildPlanRequestPrompt, buildPlanSystemPrompt } from "../src/lib/plan-generation/plan-prompt";
import { resolveWorkoutCountRange } from "../src/lib/plan-generation/split-rule";

/** USD per million tokens for claude-opus-5-5 (Anthropic price list, 2026-11); cache write = 5-minute TTL. */
const PRICE_PER_MILLION_TOKENS = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 } as const;
const TOKENS_PER_MILLION = 1_000_000;
const DEFAULT_RUNS = 2;
const SUCCESS_LOG_MESSAGE = "claude request succeeded";

/** Typical request: no personal data, same shape the app sends. */
const SAMPLE_ASSESSMENT: SavedAssessment = {
  id: "00000000-0000-0000-0000-000000000000",
  createdAt: new Date().toISOString(),
  goal: "hypertrophy",
  experienceLevel: "intermediate",
  daysPerWeek: 4,
  sessionMinutes: 60,
  splitPreference: "ai_decides",
  equipmentSlugs: [],
  limitations: "Dor leve no ombro direito ao levantar peso acima da cabeça.",
};

const candidateRowsSchema = z.array(z.object({ slug: z.string(), primary_muscles: z.array(z.string()), equipment: z.array(z.string()) }));
const usageSchema = z.object({
  durationMs: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  cacheReadTokens: z.number().nullish(),
  cacheWriteTokens: z.number().nullish(),
});
type CallUsage = z.infer<typeof usageSchema>;

function readArguments() {
  const { values } = parseArgs({ options: { candidates: { type: "string" }, effort: { type: "string" }, runs: { type: "string" } } });
  if (!values.candidates) throw new Error("--candidates <file.json> is required");
  const effort = z.enum(CLAUDE_EFFORTS).parse(values.effort ?? PLAN_GENERATION_EFFORT);
  const runs = z.coerce.number().int().min(1).parse(values.runs ?? DEFAULT_RUNS);
  return { candidatesPath: values.candidates, effort, runs };
}

async function loadCandidates(path: string): Promise<PlanCandidate[]> {
  const rows = candidateRowsSchema.parse(JSON.parse(await readFile(path, "utf8")));
  return rows.map((row) => ({ slug: row.slug, primaryMuscles: row.primary_muscles, equipment: row.equipment }));
}

/** Console logger that also keeps the metadata of each successful call (tokens, duration). */
function createRecordingLogger(recorded: CallUsage[]): Logger {
  const consoleLogger = createLogger({ minimumLevel: "info" });
  const record = (message: string, context?: LogContext) => {
    if (message === SUCCESS_LOG_MESSAGE) recorded.push(usageSchema.parse(context));
  };
  return {
    ...consoleLogger,
    info(message, context) {
      record(message, context);
      consoleLogger.info(message, context);
    },
  };
}

function estimateCostUsd(usage: CallUsage): number {
  const tokens = (usage.inputTokens ?? 0) * PRICE_PER_MILLION_TOKENS.input
    + (usage.outputTokens ?? 0) * PRICE_PER_MILLION_TOKENS.output
    + (usage.cacheWriteTokens ?? 0) * PRICE_PER_MILLION_TOKENS.cacheWrite
    + (usage.cacheReadTokens ?? 0) * PRICE_PER_MILLION_TOKENS.cacheRead;
  return tokens / TOKENS_PER_MILLION;
}

function describePlan(plan: GeneratedPlan): string {
  return plan.workouts
    .map((workout) => `  ${workout.label}: ${workout.exercises.map((exercise) => `${exercise.exerciseSlug} ${exercise.sets}x${exercise.repsMin}-${exercise.repsMax}`).join(", ")}`)
    .join("\n");
}

async function runOnce(client: ReturnType<typeof createStructuredOutputClient>, candidates: PlanCandidate[], effort: ClaudeEffort) {
  const workoutCountRange = resolveWorkoutCountRange(SAMPLE_ASSESSMENT);
  const plan = await client.generate({
    operation: PLAN_GENERATION_OPERATION,
    system: buildPlanSystemPrompt(candidates),
    prompt: buildPlanRequestPrompt(SAMPLE_ASSESSMENT, workoutCountRange),
    schema: generatedPlanSchema,
    effort,
    cacheSystem: true,
  });
  const issues = findGeneratedPlanIssues(plan, { candidateSlugs: new Set(candidates.map((candidate) => candidate.slug)), workoutCountRange });
  return { plan, issues };
}

async function main(): Promise<void> {
  const { candidatesPath, effort, runs } = readArguments();
  const candidates = await loadCandidates(candidatesPath);
  const recorded: CallUsage[] = [];
  const anthropic = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const client = createStructuredOutputClient({ client: anthropic, logger: createRecordingLogger(recorded) });
  console.log(`candidates: ${candidates.length}, effort: ${effort}, runs: ${runs}`);
  for (let run = 1; run <= runs; run += 1) {
    const { plan, issues } = await runOnce(client, candidates, effort);
    const usage = recorded.at(-1);
    console.log(`\nrun ${run}: ${usage ? `${(usage.durationMs / 1000).toFixed(1)} s, US$ ${estimateCostUsd(usage).toFixed(4)}` : "no usage"}`);
    console.log(`issues: ${issues.length === 0 ? "none" : issues.join(", ")}`);
    console.log(describePlan(plan));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
