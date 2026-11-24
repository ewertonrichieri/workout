import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { PlanRepository } from "@/lib/training/plan-repository";
import type { ReadinessRepository } from "./readiness-repository";
import { hasSeverePain, needsAdjustment } from "./readiness-rules";
import { readinessCheckinInputSchema, type CheckinResult, type ReadinessCheckinInput } from "./readiness-schema";

/** Time per workout of the latest assessment, or null without one. */
export interface SessionMinutesSource {
  findLatestSessionMinutes(userId: string): Promise<number | null>;
}

export interface ReadinessServiceDependencies {
  planRepository: PlanRepository;
  readinessRepository: ReadinessRepository;
  sessionMinutesSource: SessionMinutesSource;
}

export interface ReadinessService {
  saveCheckin(userId: string, rawInput: unknown): Promise<CheckinResult>;
}

function parseInput(rawInput: unknown): ReadinessCheckinInput {
  const parsed = readinessCheckinInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return parsed.data;
}

async function assertWorkoutInActivePlan(planRepository: PlanRepository, userId: string, workoutId: string): Promise<void> {
  const plan = await planRepository.findActivePlan(userId);
  if (!plan?.workouts.some((workout) => workout.id === workoutId)) {
    throw new NotFoundError(translate("errors.notFound", { resource: translate("training.workoutResource") }));
  }
}

export function createReadinessService(dependencies: ReadinessServiceDependencies): ReadinessService {
  return {
    async saveCheckin(userId, rawInput) {
      const input = parseInput(rawInput);
      await assertWorkoutInActivePlan(dependencies.planRepository, userId, input.workoutId);
      const sessionMinutes = await dependencies.sessionMinutesSource.findLatestSessionMinutes(userId);
      const checkinId = await dependencies.readinessRepository.saveCheckin(input);
      return { checkinId, needsAdjustment: needsAdjustment(input, sessionMinutes), hasSeverePain: hasSeverePain(input.pains) };
    },
  };
}
