import { z } from "zod";
import type { AssessmentRepository } from "@/lib/assessment/assessment-repository";
import type { SavedAssessment } from "@/lib/assessment/assessment-schema";
import { ADJUSTMENT_EFFORT, ADJUSTMENT_OPERATION } from "@/lib/constants/readiness";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { ExternalServiceError, InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import type { PlanCandidate } from "@/lib/plan-generation/plan-candidate";
import type { PlanGenerationRepository } from "@/lib/plan-generation/plan-generation-repository";
import type { PlanRepository } from "@/lib/training/plan-repository";
import type { Workout } from "@/lib/training/plan-types";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import { buildAdjustmentRequestPrompt, buildAdjustmentSystemPrompt } from "./adjustment-prompt";
import type { AdjustmentRepository, StoredCheckin } from "./adjustment-repository";
import { findAiAdjustmentIssues, findChangeIssues, resolveAiChanges, selectReplacementCandidates } from "./adjustment-rules";
import { aiDailyAdjustmentSchema, saveAdjustmentInputSchema, type AdjustmentChange, type AdjustmentProposal, type AiDailyAdjustment } from "./adjustment-schema";
import { needsAdjustment } from "./readiness-rules";

export interface AdjustmentServiceDependencies {
  adjustmentRepository: AdjustmentRepository;
  planRepository: PlanRepository;
  assessmentRepository: Pick<AssessmentRepository, "findLatestAssessment">;
  candidateSource: Pick<PlanGenerationRepository, "listCandidates">;
  structuredOutputClient: StructuredOutputClient;
  logger: Logger;
  now: () => Date;
}

export interface AdjustmentService {
  /** Asks the AI for today's adjustment (step 3B.2); nothing is saved until the user accepts. */
  proposeAdjustment(userId: string, checkinId: string): Promise<AdjustmentProposal>;
  /** Saves the accepted changes (revalidated); an empty list restores the original workout. */
  saveAdjustment(userId: string, checkinId: string, rawInput: unknown): Promise<{ changes: number }>;
}

interface AdjustmentContext {
  checkin: StoredCheckin;
  workout: Workout;
  assessment: SavedAssessment | null;
  profiles: PlanCandidate[];
  candidates: PlanCandidate[];
}

const checkinIdSchema = z.uuid();

function notFound(resourceKey: "readiness.adjustment.checkinResource" | "training.workoutResource"): NotFoundError {
  return new NotFoundError(translate("errors.notFound", { resource: translate(resourceKey) }));
}

/** Only today's unfinished check-in of the user, for a workout of the active plan. */
async function loadCheckinAndWorkout(dependencies: AdjustmentServiceDependencies, userId: string, rawCheckinId: string) {
  const checkinId = checkinIdSchema.safeParse(rawCheckinId);
  if (!checkinId.success) throw new InvalidInputError(translate("errors.invalidInput"));
  const checkin = await dependencies.adjustmentRepository.findCheckin(checkinId.data, userId);
  if (!checkin) throw notFound("readiness.adjustment.checkinResource");
  if (checkin.hasFinishedSession) throw new UnprocessableError(translate("readiness.adjustment.alreadyFinished"));
  const today = toDateInTimeZone(dependencies.now(), APP_TIME_ZONE);
  if (toDateInTimeZone(new Date(checkin.createdAt), APP_TIME_ZONE) !== today) throw new UnprocessableError(translate("readiness.adjustment.notToday"));
  const plan = await dependencies.planRepository.findActivePlan(userId);
  const workout = plan?.workouts.find((candidate) => candidate.id === checkin.workoutId);
  if (!workout) throw notFound("training.workoutResource");
  return { checkin, workout };
}

/** Swap options only exist with an assessment (its equipment); without one the AI may only reduce or remove. */
async function loadContext(dependencies: AdjustmentServiceDependencies, userId: string, rawCheckinId: string): Promise<AdjustmentContext> {
  const { checkin, workout } = await loadCheckinAndWorkout(dependencies, userId, rawCheckinId);
  const assessment = await dependencies.assessmentRepository.findLatestAssessment(userId);
  const profiles = await dependencies.adjustmentRepository.listExerciseProfiles(workout.exercises.map((item) => item.exercise.slug));
  const available = assessment ? await dependencies.candidateSource.listCandidates(assessment.equipmentSlugs) : [];
  return { checkin, workout, assessment, profiles, candidates: selectReplacementCandidates(available, profiles) };
}

function candidateSlugsOf(context: AdjustmentContext): Set<string> {
  return new Set(context.candidates.map((candidate) => candidate.slug));
}

async function requestValidAdjustment(dependencies: AdjustmentServiceDependencies, context: AdjustmentContext): Promise<AiDailyAdjustment> {
  const { checkin, workout, assessment, profiles, candidates } = context;
  const adjustment = await dependencies.structuredOutputClient.generate({
    operation: ADJUSTMENT_OPERATION,
    system: buildAdjustmentSystemPrompt(candidates),
    prompt: buildAdjustmentRequestPrompt({ checkin, workout, profiles, sessionMinutes: assessment?.sessionMinutes ?? null, limitations: assessment?.limitations ?? null }),
    schema: aiDailyAdjustmentSchema,
    effort: ADJUSTMENT_EFFORT,
    cacheSystem: true,
  });
  const issues = findAiAdjustmentIssues(adjustment, { workout, candidateSlugs: candidateSlugsOf(context), availableMinutes: checkin.availableMinutes });
  if (issues.length === 0) return adjustment;
  dependencies.logger.warn("daily adjustment rejected", { operation: ADJUSTMENT_OPERATION, issues });
  throw new ExternalServiceError(translate("ai.invalidOutput"));
}

/** Adds the replacement's name and media, so the review screen and the workout cards can show it. */
async function attachReplacements(dependencies: AdjustmentServiceDependencies, changes: readonly AdjustmentChange[]) {
  const slugs = changes.flatMap((change) => (change.replacementSlug ? [change.replacementSlug] : []));
  const exercises = await dependencies.adjustmentRepository.findExercisesBySlugs(slugs);
  return changes.map((change) => {
    const replacement = change.replacementSlug ? exercises.find((exercise) => exercise.slug === change.replacementSlug) : null;
    if (replacement === undefined) throw new ExternalServiceError(translate("ai.invalidOutput"));
    return { ...change, replacement };
  });
}

function parseSaveInput(rawInput: unknown): AdjustmentChange[] {
  const parsed = saveAdjustmentInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return parsed.data.changes;
}

export function createAdjustmentService(dependencies: AdjustmentServiceDependencies): AdjustmentService {
  return {
    async proposeAdjustment(userId, checkinId) {
      const context = await loadContext(dependencies, userId, checkinId);
      const sessionMinutes = context.assessment?.sessionMinutes ?? null;
      if (!needsAdjustment({ ...context.checkin, workoutId: context.workout.id }, sessionMinutes)) {
        throw new UnprocessableError(translate("readiness.adjustment.notNeeded"));
      }
      const adjustment = await requestValidAdjustment(dependencies, context);
      const changes = await attachReplacements(dependencies, resolveAiChanges(adjustment, context.workout).changes);
      return { checkinId: context.checkin.id, summary: adjustment.summary, estimatedMinutes: adjustment.estimatedMinutes, changes };
    },
    async saveAdjustment(userId, checkinId, rawInput) {
      const changes = parseSaveInput(rawInput);
      const context = await loadContext(dependencies, userId, checkinId);
      const issues = findChangeIssues(changes, { workout: context.workout, candidateSlugs: candidateSlugsOf(context) });
      if (issues.length > 0) {
        dependencies.logger.warn("daily adjustment changes rejected", { operation: ADJUSTMENT_OPERATION, issues });
        throw new UnprocessableError(translate("readiness.adjustment.invalidChanges"));
      }
      await dependencies.adjustmentRepository.saveAdjustments(context.checkin.id, changes);
      return { changes: changes.length };
    },
  };
}
