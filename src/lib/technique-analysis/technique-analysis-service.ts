import type { AiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import type { ExerciseRepository } from "@/lib/catalog/exercises/exercise-repository";
import type { ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { TECHNIQUE_ANALYSIS_EFFORT, TECHNIQUE_ANALYSIS_OPERATION } from "@/lib/constants/technique-analysis";
import type { TechniqueRuleSet } from "@/lib/constants/technique";
import { TECHNIQUE_RULES_CALIBRATED } from "@/lib/constants/technique-rules";
import { InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import { buildTechniqueSummary, type TechniqueSummary } from "@/lib/technique/technique-summary";
import { getMovementPattern } from "@/lib/technique/patterns/movement-patterns";
import type { MovementPattern } from "@/lib/technique/patterns/pattern-types";
import { findTechniqueRuleSet } from "@/lib/technique/technique-support";
import { buildAnalysisPrompt, TECHNIQUE_ANALYSIS_SYSTEM_PROMPT } from "./analysis-prompt";
import { sanitizeAnalysis, type SanitizedAnalysis } from "./analysis-rules";
import { aiTechniqueAnalysisSchema, type TechniqueAnalysisResult } from "./analysis-schema";
import { fromRepMetrics, hasPatternMetrics, techniqueAnalysisInputSchema, type TechniqueAnalysisInput } from "./rep-metrics";
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

interface ParsedRequest {
  input: TechniqueAnalysisInput;
  pattern: MovementPattern;
}

function findRuleSet(input: TechniqueAnalysisInput): TechniqueRuleSet {
  const ruleSet = findTechniqueRuleSet(input.exerciseSlug);
  if (!ruleSet || ruleSet.cameraView !== input.cameraView) throw new InvalidInputError(translate("technique.errors.notSupported"));
  return ruleSet;
}

/** Valid body, a supported exercise and exactly the metrics of its movement pattern (D13). */
function parseInput(rawInput: unknown): ParsedRequest {
  const parsed = techniqueAnalysisInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  const pattern = getMovementPattern(findRuleSet(parsed.data).id);
  if (!hasPatternMetrics(pattern, parsed.data.reps)) throw new InvalidInputError(translate("errors.invalidInput"));
  return { input: parsed.data, pattern };
}

/** The server classifies the reps itself; the phone only sends numbers. */
function summarize({ input, pattern }: ParsedRequest): TechniqueSummary {
  const summary = buildTechniqueSummary(pattern, input.reps.map(fromRepMetrics), TECHNIQUE_RULES_CALIBRATED);
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
  const explain = async (exerciseName: string, request: ParsedRequest, summary: TechniqueSummary, hasLimitations: boolean): Promise<SanitizedAnalysis> => {
    const { input, pattern } = request;
    const prompt = buildAnalysisPrompt({ exerciseName, cameraView: input.cameraView, pattern, assessments: summary.reps, hasLimitations });
    const output = await dependencies.structuredOutputClient.generate({
      operation: TECHNIQUE_ANALYSIS_OPERATION, system: TECHNIQUE_ANALYSIS_SYSTEM_PROMPT, prompt, schema: aiTechniqueAnalysisSchema, effort: TECHNIQUE_ANALYSIS_EFFORT,
    });
    const sanitized = sanitizeAnalysis(output, summary.reps);
    if (sanitized.issues.length > 0) logger.warn("technique analysis items dropped", { operation: TECHNIQUE_ANALYSIS_OPERATION, issues: sanitized.issues });
    return sanitized;
  };
  return {
    async analyze(userId, rawInput) {
      const request = parseInput(rawInput);
      const { input } = request;
      const summary = summarize(request);
      const exercise = await loadExercise(dependencies.exerciseSource, input.exerciseSlug);
      const hasLimitations = await dependencies.limitationsSource.hasLimitations(userId);
      await dependencies.aiUsageGuard.reserve(TECHNIQUE_ANALYSIS_OPERATION);
      const sanitized = await explain(exercise.name, request, summary, hasLimitations);
      const id = await dependencies.analysisRepository.saveAnalysis(toRecord(exercise.id, input, summary, sanitized));
      logger.info("technique analyzed", { operation: TECHNIQUE_ANALYSIS_OPERATION, repCount: summary.repCount });
      return buildResult(id, summary, sanitized, hasLimitations);
    },
  };
}
