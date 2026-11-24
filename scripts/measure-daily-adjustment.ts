// Makes one real daily-adjustment call to the Claude API (step 3B.2) and prints time, tokens, cost and the
// validation result, using the app's prompt, schema and rules. Nothing is saved.
// Usage: ANTHROPIC_API_KEY=... npx tsx scripts/measure-daily-adjustment.ts <profiles.json> <candidates.json> [effort]
// profiles.json = list_exercise_profiles of the sample workout; candidates.json = list_plan_candidates.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { CLAUDE_EFFORTS, CLAUDE_MODEL } from "../src/lib/constants/ai";
import { ADJUSTMENT_EFFORT, ADJUSTMENT_OPERATION } from "../src/lib/constants/readiness";
import { createStructuredOutputClient } from "../src/lib/integrations/claude/structured-output-client";
import { createLogger } from "../src/lib/logger/logger";
import type { PlanCandidate } from "../src/lib/plan-generation/plan-candidate";
import { buildAdjustmentRequestPrompt, buildAdjustmentSystemPrompt } from "../src/lib/readiness/adjustment-prompt";
import { findAiAdjustmentIssues, selectReplacementCandidates } from "../src/lib/readiness/adjustment-rules";
import { aiDailyAdjustmentSchema } from "../src/lib/readiness/adjustment-schema";
import type { Workout } from "../src/lib/training/plan-types";
import { computeCostUsd, readCatalogRows, readUsage } from "./lib/claude-usage";

/** A lighter day: poor sleep, moderate knee pain and half the usual time. No personal data. */
const SAMPLE_CHECKIN = {
  sleepQuality: "poor" as const,
  energyLevel: "low" as const,
  availableMinutes: 30,
  pains: [{ bodyRegion: "knees" as const, intensity: "moderate" as const }],
};
const SAMPLE_SESSION_MINUTES = 60;
const SAMPLE_SETS = 3;
const SAMPLE_REPS = 10;
const SAMPLE_REST_SECONDS = 60;

/** Sample workout built from the profiles (3x10, 60 s rest each); ids are placeholders. */
function buildSampleWorkout(profiles: readonly PlanCandidate[]): Workout {
  const exercises = profiles.map((profile, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    position: index + 1,
    category: null,
    sets: SAMPLE_SETS,
    repsMin: SAMPLE_REPS,
    repsMax: SAMPLE_REPS,
    restSeconds: SAMPLE_REST_SECONDS,
    notes: null,
    trackProgression: false,
    exercise: { id: profile.slug, slug: profile.slug, name: profile.slug, coverMedia: null, media: [] },
  }));
  return { id: "00000000-0000-4000-8000-000000000000", label: "Full body", position: 1, exercises };
}

async function main() {
  const [profilesPath, candidatesPath, effortArgument] = process.argv.slice(2);
  if (!profilesPath || !candidatesPath) throw new Error("usage: measure-daily-adjustment.ts <profiles.json> <candidates.json> [effort]");
  const effort = z.enum(CLAUDE_EFFORTS).parse(effortArgument ?? ADJUSTMENT_EFFORT);
  const profiles = await readCatalogRows(profilesPath);
  const candidates = selectReplacementCandidates(await readCatalogRows(candidatesPath), profiles);
  const workout = buildSampleWorkout(profiles);
  const logLines: string[] = [];
  const logger = createLogger({ minimumLevel: "info", writer: (line) => logLines.push(line) });
  const client = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const adjustment = await createStructuredOutputClient({ client, logger }).generate({
    operation: ADJUSTMENT_OPERATION,
    system: buildAdjustmentSystemPrompt(candidates),
    prompt: buildAdjustmentRequestPrompt({ checkin: SAMPLE_CHECKIN, workout, profiles, sessionMinutes: SAMPLE_SESSION_MINUTES, limitations: null }),
    schema: aiDailyAdjustmentSchema,
    effort,
    cacheSystem: true,
  });
  const usage = readUsage(logLines);
  const candidateSlugs = new Set(candidates.map((candidate) => candidate.slug));
  const issues = findAiAdjustmentIssues(adjustment, { workout, candidateSlugs, availableMinutes: SAMPLE_CHECKIN.availableMinutes });
  const costUsd = Number(computeCostUsd(usage, CLAUDE_MODEL).toFixed(4));
  console.log(JSON.stringify({ model: CLAUDE_MODEL, effort, candidates: candidates.length, ...usage, costUsd, issues, adjustment }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exitCode = 1;
});
