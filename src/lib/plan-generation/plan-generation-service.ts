import { z } from "zod";
import type { AssessmentRepository } from "@/lib/assessment/assessment-repository";
import type { SavedAssessment } from "@/lib/assessment/assessment-schema";
import { PLAN_GENERATION_EFFORT, PLAN_GENERATION_MODEL, PLAN_GENERATION_OPERATION } from "@/lib/constants/plan-generation";
import { ExternalServiceError, InvalidInputError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import type { PlanRepository } from "@/lib/training/plan-repository";
import { generatedPlanSchema, type GeneratedPlan } from "./generated-plan-schema";
import { findGeneratedPlanIssues } from "./generated-plan-validation";
import type { PlanCandidate } from "./plan-candidate";
import { computeGeneratedPlanDates } from "./plan-dates";
import type { PlanGenerationRepository } from "./plan-generation-repository";
import { buildPlanRequestPrompt, buildPlanSystemPrompt } from "./plan-prompt";
import { resolveWorkoutCountRange } from "./split-rule";

const generatePlanInputSchema = z.object({ replaceActivePlan: z.boolean() });

export interface PlanGenerationDependencies {
  assessmentRepository: Pick<AssessmentRepository, "findLatestAssessment">;
  planRepository: PlanRepository;
  generationRepository: PlanGenerationRepository;
  structuredOutputClient: StructuredOutputClient;
  logger: Logger;
  now: () => Date;
}

export interface PlanGenerationService {
  /** Builds a plan with AI from the user's latest assessment and saves it as the active plan. */
  generatePlan(userId: string, rawInput: unknown): Promise<{ planId: string }>;
  /** What the screens offer: answer the assessment, generate, or replace the plan. */
  getGenerationStatus(userId: string): Promise<GenerationStatus>;
}

export interface GenerationStatus {
  hasAssessment: boolean;
  hasActivePlan: boolean;
}

function parseInput(rawInput: unknown): z.infer<typeof generatePlanInputSchema> {
  const parsed = generatePlanInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return parsed.data;
}

/** Cheap checks first, so the AI is called only when the plan can be saved. */
async function loadGenerationContext(dependencies: PlanGenerationDependencies, userId: string, replaceActivePlan: boolean) {
  const assessment = await dependencies.assessmentRepository.findLatestAssessment(userId);
  if (!assessment) throw new UnprocessableError(translate("planGeneration.noAssessment"));
  if (!replaceActivePlan && (await dependencies.planRepository.findActivePlan(userId))) {
    throw new UnprocessableError(translate("planGeneration.activePlanExists"));
  }
  const candidates = await dependencies.generationRepository.listCandidates(assessment.equipmentSlugs);
  if (candidates.length === 0) throw new UnprocessableError(translate("planGeneration.noCandidates"));
  return { assessment, candidates };
}

async function requestValidPlan(dependencies: PlanGenerationDependencies, assessment: SavedAssessment, candidates: PlanCandidate[]): Promise<GeneratedPlan> {
  const workoutCountRange = resolveWorkoutCountRange(assessment);
  const plan = await dependencies.structuredOutputClient.generate({
    operation: PLAN_GENERATION_OPERATION,
    system: buildPlanSystemPrompt(candidates),
    prompt: buildPlanRequestPrompt(assessment, workoutCountRange),
    schema: generatedPlanSchema,
    model: PLAN_GENERATION_MODEL,
    effort: PLAN_GENERATION_EFFORT,
    cacheSystem: true,
  });
  const issues = findGeneratedPlanIssues(plan, { candidateSlugs: new Set(candidates.map((candidate) => candidate.slug)), workoutCountRange });
  if (issues.length === 0) return plan;
  dependencies.logger.warn("generated plan rejected", { operation: PLAN_GENERATION_OPERATION, issues });
  throw new ExternalServiceError(translate("ai.invalidOutput"));
}

export function createPlanGenerationService(dependencies: PlanGenerationDependencies): PlanGenerationService {
  return {
    async generatePlan(userId, rawInput) {
      const { replaceActivePlan } = parseInput(rawInput);
      const { assessment, candidates } = await loadGenerationContext(dependencies, userId, replaceActivePlan);
      const plan = await requestValidPlan(dependencies, assessment, candidates);
      const dates = computeGeneratedPlanDates(dependencies.now());
      const planId = await dependencies.generationRepository.createGeneratedPlan({
        assessmentId: assessment.id,
        goal: assessment.goal,
        ...dates,
        replaceActivePlan,
        plan,
      });
      return { planId };
    },
    async getGenerationStatus(userId) {
      const [assessment, activePlan] = await Promise.all([
        dependencies.assessmentRepository.findLatestAssessment(userId),
        dependencies.planRepository.findActivePlan(userId),
      ]);
      return { hasAssessment: assessment !== null, hasActivePlan: activePlan !== null };
    },
  };
}
