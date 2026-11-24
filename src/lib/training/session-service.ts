import { InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { PlanRepository } from "./plan-repository";
import type { Workout } from "./plan-types";
import type { SessionRepository } from "./session-repository";
import { finishWorkoutInputSchema, type FinishedSet, type FinishedSubstitution, type FinishWorkoutInput } from "./session-schema";

export interface SessionService {
  finishWorkout(userId: string, rawInput: unknown): Promise<{ sessionId: string }>;
}

function parseInput(rawInput: unknown): FinishWorkoutInput {
  const parsed = finishWorkoutInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return parsed.data;
}

function matchesPrescription(workout: Workout, set: FinishedSet): boolean {
  const prescribed = workout.exercises.find((exercise) => exercise.id === set.workoutExerciseId);
  return prescribed !== undefined && set.setNumber <= prescribed.sets;
}

/** Every set must belong to the workout, within the prescribed sets, and appear only once. */
function assertSetsMatchWorkout(workout: Workout, sets: readonly FinishedSet[]): void {
  if (sets.length === 0) throw new UnprocessableError(translate("training.finish.noSets"));
  const keys = new Set(sets.map((set) => `${set.workoutExerciseId}:${set.setNumber}`));
  const isValid = keys.size === sets.length && sets.every((set) => matchesPrescription(workout, set));
  if (!isValid) throw new UnprocessableError(translate("training.finish.setsMismatch"));
}

/** Each swap is of an exercise of this workout, once, and to a different exercise each (step 3B.4). */
function assertSubstitutionsMatchWorkout(workout: Workout, substitutions: readonly FinishedSubstitution[]): void {
  const ids = substitutions.map((item) => item.workoutExerciseId);
  const slugs = substitutions.map((item) => item.exerciseSlug);
  const isKnown = ids.every((id) => workout.exercises.some((exercise) => exercise.id === id));
  if (!isKnown || new Set(ids).size !== ids.length || new Set(slugs).size !== slugs.length) {
    throw new UnprocessableError(translate("training.substitution.substitutionsMismatch"));
  }
}

export function createSessionService(planRepository: PlanRepository, sessionRepository: SessionRepository): SessionService {
  return {
    async finishWorkout(userId, rawInput) {
      const input = parseInput(rawInput);
      const plan = await planRepository.findActivePlan(userId);
      const workout = plan?.workouts.find((candidate) => candidate.id === input.workoutId);
      if (!workout) throw new NotFoundError(translate("errors.notFound", { resource: translate("training.workoutResource") }));
      assertSetsMatchWorkout(workout, input.sets);
      assertSubstitutionsMatchWorkout(workout, input.substitutions ?? []);
      return { sessionId: await sessionRepository.finishSession(input) };
    },
  };
}
