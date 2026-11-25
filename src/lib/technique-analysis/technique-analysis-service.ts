import type { AiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import type { ExerciseRepository } from "@/lib/catalog/exercises/exercise-repository";
import type { ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { TECHNIQUE_ANALYSIS_EFFORT, TECHNIQUE_ANALYSIS_OPERATION } from "@/lib/constants/technique-analysis";
import { SQUAT_RULES_CALIBRATED } from "@/lib/constants/technique-rules";
import { InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import { buildTechniqueSummary, type TechniqueSummary } from "@/lib/technique/technique-summary";
import { findTechniqueRuleSet } from "@/lib/technique/technique-support";
import { buildAnalysisPrompt, TECHNIQUE_ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompt";
import { sanitizeAnalysis, type SanitizedAnalysis } from "./analysis-rules";
import { aiTechniqueAnalysisSchema, type TechniqueAnalysisResult } from "./analysis-schema";
import { fromRepMetrics, techniqueAnalysisInputSchema, type TechniqueAnalysisInput } from "./rep-metrics";
import type { TechniqueAnalysisRecord, TechniqueAnalysisRepository } from "./technique-analysis-repository";

/** Whether the latest assessment reports an injury or limitation (health reinforcement, as in step 3.7). */
export interface LimitationsSource {
  hasLimitations(userId: string): Promise<boolean>;
}

export interface TechniqueAnalysisServiceDependencies {
  exerciseSource: Pick<ExerciseRepository, "findBySlug">;
  limitationsSource: LimitationsSource;
  aiUsageGuard: AiUsageGuard;
  structuredOutputClient: StructuredOutputClient;
  analysisRepository: TechniqueAnalysisRepository;
  logger: Logger;
}

export interface TechniqueAnalysisService {
  /** Explains a set measured on the phone (step 5.4): server rules, then the AI, then the history (D9). */
  analyze(userId: string, rawInput: unknown): Promise<TechniqueAnalysisResult>;
}

function parseInput(rawInput: unknown): TechniqueAnalysisInput {
  const parsed = techniqueAnalysisInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  const ruleSet = findTechniqueRuleSet(parsed.data.exerciseSlug);
  if (!ruleSet || ruleSet.cameraView !== parsed.data.cameraView) throw new InvalidInputError(translate("technique.errors.notSupported"));
  return parsed.data;
}

/** The server classifies the reps itself; the phone only sends numbers. */
function summarize(input: TechniqueAnalysisInput): TechniqueSummary {
  const summary = buildTechniqueSummary(input.reps.map(fromRepMetrics), SQUAT_RULES_CALIBRATED);
  if (summary.needsRerecord) throw new UnprocessableError(translate("technique.summary.rerecord"));
  return summary;
}

async function loadExercise(source: TechniqueAnalysisServiceDependencies["exerciseSource"], slug: string): Promise<ExerciseDetail> {
  const exercise = await source.findBySlug(slug);
  if (!exercise) throw new NotFoundError(translate("errors.notFound", { resource: translate("catalog.exerciseResource") }));
  return exercise;
}

function scoresByRep({ analysis }: SanitizedAnalysis): Map<number, number> {
  return new Map(analysis.reps.map((rep) => [rep.repNumber, rep.score]));
}

function toRecord(exerciseId: string, input: TechniqueAnalysisInput, summary: TechniqueSummary, sanitized: SanitizedAnalysis): TechniqueAnalysisRecord {
  const scores = scoresByRep(sanitized);
  const { analysis } = sanitized;
  return {
    exerciseId, cameraView: input.cameraView, overallScore: analysis.overallScore, mainTip: analysis.mainTip,
    reps: summary.reps.map(({ rep, issues }) => ({ rep, score: scores.get(rep.repNumber) ?? null, issues })),
    strengths: analysis.strengths, corrections: analysis.corrections,
  };
}

function buildResult(id: string, summary: TechniqueSummary, sanitized: SanitizedAnalysis, hasLimitations: boolean): TechniqueAnalysisResult {
  const scores = scoresByRep(sanitized);
  const { analysis } = sanitized;
  const reps = summary.reps.map(({ rep, issues }) => ({ repNumber: rep.repNumber, score: scores.get(rep.repNumber) ?? null, isEvaluated: rep.isEvaluated, issues }));
  return { id, overallScore: analysis.overallScore, mainTip: analysis.mainTip, strengths: analysis.strengths, corrections: analysis.corrections, reps, hasLimitations };
}

export function createTechniqueAnalysisService(dependencies: TechniqueAnalysisServiceDependencies): TechniqueAnalysisService {
  const { logger } = dependencies;
  const explain = async (exerciseName: string, input: TechniqueAnalysisInput, summary: TechniqueSummary, hasLimitations: boolean): Promise<SanitizedAnalysis> => {
    const prompt = buildAnalysisPrompt({ exerciseName, cameraView: input.cameraView, assessments: summary.reps, hasLimitations });
    const output = await dependencies.structuredOutputClient.generate({
      operation: TECHNIQUE_ANALYSIS_OPERATION, system: TECHNIQUE_ANALYSIS_SYSTEM_PROMPT, prompt, schema: aiTechniqueAnalysisSchema, effort: TECHNIQUE_ANALYSIS_EFFORT,
    });
    const sanitized = sanitizeAnalysis(output, summary.reps);
    if (sanitized.issues.length > 0) logger.warn("technique analysis items dropped", { operation: TECHNIQUE_ANALYSIS_OPERATION, issues: sanitized.issues });
    return sanitized;
  };
  return {
    async analyze(userId, rawInput) {
      const input = parseInput(rawInput);
      const summary = summarize(input);
      const exercise = await loadExercise(dependencies.exerciseSource, input.exerciseSlug);
      const hasLimitations = await dependencies.limitationsSource.hasLimitations(userId);
      await dependencies.aiUsageGuard.reserve(TECHNIQUE_ANALYSIS_OPERATION);
      const sanitized = await explain(exercise.name, input, summary, hasLimitations);
      const id = await dependencies.analysisRepository.saveAnalysis(toRecord(exercise.id, input, summary, sanitized));
      logger.info("technique analyzed", { operation: TECHNIQUE_ANALYSIS_OPERATION, repCount: summary.repCount });
      return buildResult(id, summary, sanitized, hasLimitations);
    },
  };
}
