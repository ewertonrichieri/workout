// Makes one real technique analysis call to the Claude API (step 5.4) with the app's rules, prompt and sanitizing,
// using a fictional set of the chosen movement pattern (numbers only), and prints time, tokens, cost and the answer. Nothing is saved.
// Usage: ANTHROPIC_API_KEY=... npx tsx scripts/measure-technique-analysis.ts [--pattern=squat|hinge|row] [--effort=low] [--limitations]
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseClaudeConfig } from "../src/lib/config/claude-config";
import { CLAUDE_EFFORTS, CLAUDE_MODEL } from "../src/lib/constants/ai";
import { TECHNIQUE_ANALYSIS_EFFORT, TECHNIQUE_ANALYSIS_OPERATION } from "../src/lib/constants/technique-analysis";
import { TECHNIQUE_RULE_SET_IDS, type TechniqueRuleSetId } from "../src/lib/constants/technique";
import { TECHNIQUE_RULES_CALIBRATED } from "../src/lib/constants/technique-rules";
import { getMovementPattern } from "../src/lib/technique/patterns/movement-patterns";
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
const PATTERN_PREFIX = "--pattern=";

type FictionalRep = [durationMs: number, descentMs: number, metrics: Record<string, number>];

function buildSet(reps: readonly FictionalRep[]): RepMetrics[] {
  return reps.map(([durationMs, descentMs, metrics], index) => ({ repNumber: index + 1, durationMs, descentMs, frameCount: 60, seenFrameCount: 60, metrics }));
}

/** Fictional sets (numbers only): squat with shallow reps and fatigue; hinge and row shaped like the calibration video. */
const FICTIONAL_SETS: Record<TechniqueRuleSetId, { exerciseName: string; reps: RepMetrics[] }> = {
  squat: {
    exerciseName: "Agachamento livre com barra",
    reps: buildSet([
      [2600, 1300, { minKneeAngle: 62, minThighAngle: -3, maxTrunkLean: 38, maxKneeTravelRatio: 0.1, maxHeelRiseRatio: 0.05 }],
      [2500, 1200, { minKneeAngle: 64, minThighAngle: -1, maxTrunkLean: 40, maxKneeTravelRatio: 0.12, maxHeelRiseRatio: 0.06 }],
      [2100, 900, { minKneeAngle: 84, minThighAngle: 14, maxTrunkLean: 42, maxKneeTravelRatio: 0.08, maxHeelRiseRatio: 0.04 }],
      [1700, 600, { minKneeAngle: 90, minThighAngle: 19, maxTrunkLean: 47, maxKneeTravelRatio: 0.09, maxHeelRiseRatio: 0.05 }],
      [2200, 1000, { minKneeAngle: 70, minThighAngle: 4, maxTrunkLean: 58, maxKneeTravelRatio: 0.15, maxHeelRiseRatio: 0.07 }],
    ]),
  },
  hinge: {
    exerciseName: "Terra romeno com barra",
    reps: buildSet([
      [2500, 1300, { minHipAngle: 74, minKneeAngle: 150, maxTrunkLean: 70 }],
      [2600, 1200, { minHipAngle: 76, minKneeAngle: 148, maxTrunkLean: 68 }],
      [1800, 900, { minHipAngle: 110, minKneeAngle: 152, maxTrunkLean: 50 }],
      [2900, 1700, { minHipAngle: 60, minKneeAngle: 120, maxTrunkLean: 62 }],
      [1100, 500, { minHipAngle: 82, minKneeAngle: 146, maxTrunkLean: 66 }],
    ]),
  },
  row: {
    exerciseName: "Remada curvada com barra",
    reps: buildSet([
      [1600, 700, { maxWristHeight: 0.35, trunkRise: 2, restTrunkLean: 50, minElbowAngle: 95 }],
      [1500, 700, { maxWristHeight: 0.3, trunkRise: 3, restTrunkLean: 50, minElbowAngle: 98 }],
      [1200, 500, { maxWristHeight: 0.02, trunkRise: 1, restTrunkLean: 49, minElbowAngle: 125 }],
      [1700, 800, { maxWristHeight: 0.95, trunkRise: 12, restTrunkLean: 51, minElbowAngle: 70 }],
      [1600, 700, { maxWristHeight: 0.28, trunkRise: 4, restTrunkLean: 50, minElbowAngle: 100 }],
    ]),
  },
};

function parseArguments(argumentsList: readonly string[]) {
  const effortArgument = argumentsList.find((argument) => argument.startsWith(EFFORT_PREFIX))?.slice(EFFORT_PREFIX.length);
  const patternArgument = argumentsList.find((argument) => argument.startsWith(PATTERN_PREFIX))?.slice(PATTERN_PREFIX.length);
  return {
    effort: z.enum(CLAUDE_EFFORTS).parse(effortArgument ?? TECHNIQUE_ANALYSIS_EFFORT),
    hasLimitations: argumentsList.includes(LIMITATIONS_FLAG),
    patternId: z.enum(TECHNIQUE_RULE_SET_IDS).parse(patternArgument ?? "squat"),
  };
}

async function main() {
  const { effort, hasLimitations, patternId } = parseArguments(process.argv.slice(2));
  const pattern = getMovementPattern(patternId);
  const set = FICTIONAL_SETS[patternId];
  const summary = buildTechniqueSummary(pattern, set.reps.map(fromRepMetrics), TECHNIQUE_RULES_CALIBRATED);
  const logLines: string[] = [];
  const logger = createLogger({ minimumLevel: "info", writer: (line) => logLines.push(line) });
  const client = new Anthropic({ apiKey: parseClaudeConfig(process.env).apiKey, maxRetries: 0 });
  const startedAt = performance.now();
  const output = await createStructuredOutputClient({ client, logger }).generate({
    operation: TECHNIQUE_ANALYSIS_OPERATION,
    system: TECHNIQUE_ANALYSIS_SYSTEM_PROMPT,
    prompt: buildAnalysisPrompt({ exerciseName: set.exerciseName, cameraView: "side", pattern, assessments: summary.reps, hasLimitations }),
    schema: aiTechniqueAnalysisSchema,
    effort,
  });
  const seconds = Number(((performance.now() - startedAt) / 1000).toFixed(1));
  const usage = readUsage(logLines);
  const costUsd = Number(computeCostUsd(usage, CLAUDE_MODEL).toFixed(5));
  const issuesByRep = summary.reps.map(({ rep, issues }) => `${rep.repNumber}: ${issues.map((item) => item.issue).join(", ") || "none"}`);
  const sanitized = sanitizeAnalysis(output, summary.reps);
  console.log(JSON.stringify({ model: CLAUDE_MODEL, effort, patternId, seconds, ...usage, costUsd, issuesByRep, ...sanitized }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exitCode = 1;
});
