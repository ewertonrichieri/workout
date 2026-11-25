// Makes one real technique analysis call to the Claude API (step 5.4) with the app's rules, prompt and sanitizing,
// using a fictional squat set (numbers only), and prints time, tokens, cost and the answer. Nothing is saved.
// Usage: ANTHROPIC_API_KEY=... npx tsx scripts/measure-technique-analysis.ts [--effort=low] [--limitations]
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { CLAUDE_EFFORTS, CLAUDE_MODEL } from "../src/lib/constants/ai";
import { TECHNIQUE_ANALYSIS_EFFORT, TECHNIQUE_ANALYSIS_OPERATION } from "../src/lib/constants/technique-analysis";
import { SQUAT_RULES_CALIBRATED } from "../src/lib/constants/technique-rules";
import { buildAnalysisPrompt, TECHNIQUE_ANALYSIS_SYSTEM_PROMPT } from "../src/lib/technique-analysis/analysis-prompt";
import { sanitizeAnalysis } from "../src/lib/technique-analysis/analysis-rules";
import { aiTechniqueAnalysisSchema } from "../src/lib/technique-analysis/analysis-schema";
import { fromRepMetrics, type RepMetrics } from "../src/lib/technique-analysis/rep-metrics";
import { buildTechniqueSummary } from "../src/lib/technique/technique-summary";
import { createStructuredOutputClient } from "../src/lib/integrations/claude/structured-output-client";
import { createLogger } from "../src/lib/logger/logger";
import { computeCostUsd, readUsage } from "./lib/claude-usage";

const EFFORT_PREFIX = "--effort=";
const LIMITATIONS_FLAG = "--limitations";

/** Fictional set: two good reps, two shallow ones and a last rep with the trunk dropping (fatigue). */
const FICTIONAL_SET: RepMetrics[] = [
  { repNumber: 1, durationMs: 2600, descentMs: 1300, minKneeAngle: 62, minThighAngle: -3, maxTrunkLean: 38, maxKneeTravelRatio: 0.1, maxHeelRiseRatio: 0.05, frameCount: 78, seenFrameCount: 78 },
  { repNumber: 2, durationMs: 2500, descentMs: 1200, minKneeAngle: 64, minThighAngle: -1, maxTrunkLean: 40, maxKneeTravelRatio: 0.12, maxHeelRiseRatio: 0.06, frameCount: 75, seenFrameCount: 75 },
  { repNumber: 3, durationMs: 2100, descentMs: 900, minKneeAngle: 84, minThighAngle: 14, maxTrunkLean: 42, maxKneeTravelRatio: 0.08, maxHeelRiseRatio: 0.04, frameCount: 63, seenFrameCount: 63 },
  { repNumber: 4, durationMs: 1700, descentMs: 600, minKneeAngle: 90, minThighAngle: 19, maxTrunkLean: 47, maxKneeTravelRatio: 0.09, maxHeelRiseRatio: 0.05, frameCount: 51, seenFrameCount: 51 },
  { repNumber: 5, durationMs: 2200, descentMs: 1000, minKneeAngle: 70, minThighAngle: 4, maxTrunkLean: 58, maxKneeTravelRatio: 0.15, maxHeelRiseRatio: 0.07, frameCount: 66, seenFrameCount: 66 },
];

function parseArguments(argumentsList: readonly string[]) {
  const effortArgument = argumentsList.find((argument) => argument.startsWith(EFFORT_PREFIX))?.slice(EFFORT_PREFIX.length);
  return { effort: z.enum(CLAUDE_EFFORTS).parse(effortArgument ?? TECHNIQUE_ANALYSIS_EFFORT), hasLimitations: argumentsList.includes(LIMITATIONS_FLAG) };
}

async function main() {
  const { effort, hasLimitations } = parseArguments(process.argv.slice(2));
  const summary = buildTechniqueSummary(FICTIONAL_SET.map(fromRepMetrics), SQUAT_RULES_CALIBRATED);
  const logLines: string[] = [];
  const logger = createLogger({ minimumLevel: "info", writer: (line) => logLines.push(line) });
  const client = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const startedAt = performance.now();
  const output = await createStructuredOutputClient({ client, logger }).generate({
    operation: TECHNIQUE_ANALYSIS_OPERATION,
    system: TECHNIQUE_ANALYSIS_SYSTEM_PROMPT,
    prompt: buildAnalysisPrompt({ exerciseName: "Agachamento livre com barra", cameraView: "side", assessments: summary.reps, hasLimitations }),
    schema: aiTechniqueAnalysisSchema,
    effort,
  });
  const seconds = Number(((performance.now() - startedAt) / 1000).toFixed(1));
  const usage = readUsage(logLines);
  const costUsd = Number(computeCostUsd(usage, CLAUDE_MODEL).toFixed(5));
  const issuesByRep = summary.reps.map(({ rep, issues }) => `${rep.repNumber}: ${issues.map((item) => item.issue).join(", ") || "none"}`);
  const sanitized = sanitizeAnalysis(output, summary.reps);
  console.log(JSON.stringify({ model: CLAUDE_MODEL, effort, seconds, ...usage, costUsd, issuesByRep, ...sanitized }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exitCode = 1;
});
