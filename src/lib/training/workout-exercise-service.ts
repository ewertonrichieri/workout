import { z } from "zod";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { PlanRepository } from "./plan-repository";
import type { WorkoutExerciseRepository } from "./workout-exercise-repository";

export type { WorkoutExerciseRepository } from "./workout-exercise-repository";

export interface WorkoutExerciseService {
  setTrackProgression(userId: string, workoutExerciseId: string, rawInput: unknown): Promise<{ trackProgression: boolean }>;
}

const workoutExerciseIdSchema = z.uuid();
export const trackProgressionInputSchema = z.object({ trackProgression: z.boolean() });

function parseInput(workoutExerciseId: string, rawInput: unknown) {
  const id = workoutExerciseIdSchema.safeParse(workoutExerciseId);
  const body = trackProgressionInputSchema.safeParse(rawInput);
  if (!id.success || !body.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return { id: id.data, trackProgression: body.data.trackProgression };
}

export function createWorkoutExerciseService(planRepository: PlanRepository, repository: WorkoutExerciseRepository): WorkoutExerciseService {
  return {
    async setTrackProgression(userId, workoutExerciseId, rawInput) {
      const { id, trackProgression } = parseInput(workoutExerciseId, rawInput);
      const plan = await planRepository.findActivePlan(userId);
      const isOwned = plan?.workouts.some((workout) => workout.exercises.some((item) => item.id === id)) ?? false;
      if (!isOwned) throw new NotFoundError(translate("errors.notFound", { resource: translate("catalog.exerciseResource") }));
      await repository.updateTrackProgression(id, trackProgression);
      return { trackProgression };
    },
  };
}
