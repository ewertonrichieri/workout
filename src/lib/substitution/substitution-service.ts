import { createHash } from "node:crypto";
import { z } from "zod";
import type { AssessmentRepository } from "@/lib/assessment/assessment-repository";
import {
  ALWAYS_AVAILABLE_EQUIPMENT,
  MAX_SUBSTITUTION_CANDIDATES_FOR_AI,
  MAX_SUBSTITUTION_SUGGESTIONS,
  SUBSTITUTION_EFFORT,
  SUBSTITUTION_OPERATION,
} from "@/lib/constants/substitution";
import { ExternalServiceError, InvalidInputError, RepositoryError, NotFoundError, RateLimitExceededError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import type { AdjustmentRepository } from "@/lib/readiness/adjustment-repository";
import type { PlanRepository } from "@/lib/training/plan-repository";
import type { ActivePlan, Workout, WorkoutExercise } from "@/lib/training/plan-types";
import { buildSubstitutionPrompt, SUBSTITUTION_SYSTEM_PROMPT } from "./substitution-prompt";
import type { CachedSubstitutionChoice, SubstitutionCacheRepository } from "./substitution-cache-repository";
import type { SubstitutionRepository } from "./substitution-repository";
import { filterCandidates, findSuggestionIssues, rankCandidates } from "./substitution-rules";
import { aiSubstitutionSchema, substitutionRequestSchema, type SubstitutionProfile, type SubstitutionRequest, type SubstitutionResult } from "./substitution-schema";

export interface SubstitutionServiceDependencies {
  planRepository: PlanRepository;
  assessmentRepository: Pick<AssessmentRepository, "findLatestAssessment">;
  substitutionRepository: SubstitutionRepository;
  cacheRepository: SubstitutionCacheRepository;
  exerciseSource: Pick<AdjustmentRepository, "listExerciseProfiles" | "findExercisesBySlugs">;
  structuredOutputClient: StructuredOutputClient;
  logger: Logger;
}

export interface SubstitutionService {
  /** Up to 3 equivalent exercises for a planned one (step 3B.4); nothing is saved until finishing. */
  suggestSubstitutes(userId: string, workoutExerciseId: string, rawInput: unknown): Promise<SubstitutionResult>;
}

interface Choice {
  slug: string;
  reason: string | null;
}

interface SubstitutionContext {
  workout: Workout;
  prescription: WorkoutExercise;
  request: SubstitutionRequest;
  original: SubstitutionProfile;
  ranked: SubstitutionProfile[];
  limitations: string | null;
}

const prescriptionIdSchema = z.uuid();

function parseInput(workoutExerciseId: string, rawInput: unknown): { id: string; request: SubstitutionRequest } {
  const id = prescriptionIdSchema.safeParse(workoutExerciseId);
  const request = substitutionRequestSchema.safeParse(rawInput);
  if (!id.success || !request.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return { id: id.data, request: request.data };
}

function findPrescription(plan: ActivePlan | null, id: string): { plan: ActivePlan; workout: Workout; prescription: WorkoutExercise } {
  for (const workout of plan?.workouts ?? []) {
    const prescription = workout.exercises.find((item) => item.id === id);
    if (plan && prescription) return { plan, workout, prescription };
  }
  throw new NotFoundError(translate("errors.notFound", { resource: translate("training.workoutResource") }));
}

/** The assessment's equipment; without one, the equipment of the plan's exercises plus bodyweight. */
async function resolveEquipment(dependencies: SubstitutionServiceDependencies, userId: string, plan: ActivePlan) {
  const assessment = await dependencies.assessmentRepository.findLatestAssessment(userId);
  if (assessment) return { equipment: assessment.equipmentSlugs, limitations: assessment.limitations };
  const slugs = [...new Set(plan.workouts.flatMap((workout) => workout.exercises.map((item) => item.exercise.slug)))];
  const profiles = await dependencies.exerciseSource.listExerciseProfiles(slugs);
  return { equipment: [...new Set([...profiles.flatMap((profile) => profile.equipment), ALWAYS_AVAILABLE_EQUIPMENT])], limitations: null };
}

async function loadContext(dependencies: SubstitutionServiceDependencies, userId: string, workoutExerciseId: string, rawInput: unknown): Promise<SubstitutionContext> {
  const { id, request } = parseInput(workoutExerciseId, rawInput);
  const { plan, workout, prescription } = findPrescription(await dependencies.planRepository.findActivePlan(userId), id);
  const { equipment, limitations } = await resolveEquipment(dependencies, userId, plan);
  const options = await dependencies.substitutionRepository.listCandidates(prescription.exercise.slug, equipment);
  if (!options.original) throw new UnprocessableError(translate("training.substitution.noCandidates"));
  const excludedSlugs = new Set([...workout.exercises.map((item) => item.exercise.slug), ...request.excludeSlugs]);
  const ranked = rankCandidates(filterCandidates(options.candidates, { original: options.original, reason: request.reason, excludedSlugs }), options.original);
  if (ranked.length === 0) throw new UnprocessableError(translate("training.substitution.noCandidates"));
  return { workout, prescription, request, original: options.original, ranked, limitations };
}

function isAiFailure(error: unknown): error is ExternalServiceError | RateLimitExceededError {
  return error instanceof ExternalServiceError || error instanceof RateLimitExceededError;
}

interface AiRequest {
  prompt: string;
  candidateSlugs: Set<string>;
  /** Hash of the exact AI input: same plan, equipment, reason, limitations and options → same key. */
  cacheKey: string;
}

function buildAiRequest(context: SubstitutionContext): AiRequest {
  const candidates = context.ranked.slice(0, MAX_SUBSTITUTION_CANDIDATES_FOR_AI);
  const prompt = buildSubstitutionPrompt({ original: context.original, prescription: context.prescription, reason: context.request.reason, limitations: context.limitations, candidates });
  const cacheKey = createHash("sha256").update(SUBSTITUTION_SYSTEM_PROMPT).update("\n").update(prompt).digest("hex");
  return { prompt, candidateSlugs: new Set(candidates.map((candidate) => candidate.slug)), cacheKey };
}

/** Saved choices still valid for the options (same checks as a fresh AI answer); any cache failure is a miss. */
async function findCachedChoices(dependencies: SubstitutionServiceDependencies, request: AiRequest): Promise<Choice[] | null> {
  try {
    const cached = await dependencies.cacheRepository.findChoices(request.cacheKey);
    if (!cached) return null;
    const issues = findSuggestionIssues({ suggestions: cached.map((choice) => ({ exerciseSlug: choice.slug, reason: choice.reason })) }, request.candidateSlugs);
    return issues.length === 0 ? cached : null;
  } catch (error) {
    if (!(error instanceof RepositoryError)) throw error;
    dependencies.logger.warn("substitution cache read failed", { operation: error.operation });
    return null;
  }
}

/** The cache only saves money: a failed write never fails the swap. */
async function saveCachedChoices(dependencies: SubstitutionServiceDependencies, cacheKey: string, choices: readonly CachedSubstitutionChoice[]): Promise<void> {
  try {
    await dependencies.cacheRepository.saveChoices(cacheKey, choices);
  } catch (error) {
    if (!(error instanceof RepositoryError)) throw error;
    dependencies.logger.warn("substitution cache write failed", { operation: error.operation });
  }
}

/** Any AI failure or invalid answer returns null (automatic order). */
async function askAi(dependencies: SubstitutionServiceDependencies, request: AiRequest): Promise<CachedSubstitutionChoice[] | null> {
  try {
    const output = await dependencies.structuredOutputClient.generate({
      operation: SUBSTITUTION_OPERATION,
      system: SUBSTITUTION_SYSTEM_PROMPT,
      prompt: request.prompt,
      schema: aiSubstitutionSchema,
      effort: SUBSTITUTION_EFFORT,
    });
    const issues = findSuggestionIssues(output, request.candidateSlugs);
    if (issues.length === 0) return output.suggestions.map((suggestion) => ({ slug: suggestion.exerciseSlug, reason: suggestion.reason }));
    dependencies.logger.warn("substitution suggestions rejected", { operation: SUBSTITUTION_OPERATION, issues });
  } catch (error) {
    if (!isAiFailure(error)) throw error;
    dependencies.logger.warn("substitution falls back to the automatic order", { operation: SUBSTITUTION_OPERATION, error: error.name });
  }
  return null;
}

/**
 * The AI picks among the best-ranked options; the same swap again comes from the cache (SUB-001).
 * With 3 options or fewer there is nothing to choose (it would only reorder them): no AI call (cost control).
 */
async function chooseWithAi(dependencies: SubstitutionServiceDependencies, context: SubstitutionContext): Promise<Choice[] | null> {
  if (context.ranked.length <= MAX_SUBSTITUTION_SUGGESTIONS) return null;
  const request = buildAiRequest(context);
  const cached = await findCachedChoices(dependencies, request);
  if (cached) return cached;
  const choices = await askAi(dependencies, request);
  if (choices) await saveCachedChoices(dependencies, request.cacheKey, choices);
  return choices;
}

async function toResult(dependencies: SubstitutionServiceDependencies, choices: readonly Choice[], isAutomatic: boolean): Promise<SubstitutionResult> {
  const exercises = await dependencies.exerciseSource.findExercisesBySlugs(choices.map((choice) => choice.slug));
  const suggestions = choices.flatMap((choice) => {
    const exercise = exercises.find((item) => item.slug === choice.slug);
    return exercise ? [{ exercise, reason: choice.reason }] : [];
  });
  if (suggestions.length === 0) throw new UnprocessableError(translate("training.substitution.noCandidates"));
  return { isAutomatic, suggestions };
}

export function createSubstitutionService(dependencies: SubstitutionServiceDependencies): SubstitutionService {
  return {
    async suggestSubstitutes(userId, workoutExerciseId, rawInput) {
      const context = await loadContext(dependencies, userId, workoutExerciseId, rawInput);
      const aiChoices = await chooseWithAi(dependencies, context);
      if (aiChoices) return toResult(dependencies, aiChoices, false);
      const automatic = context.ranked.slice(0, MAX_SUBSTITUTION_SUGGESTIONS).map((item) => ({ slug: item.slug, reason: null }));
      return toResult(dependencies, automatic, true);
    },
  };
}
