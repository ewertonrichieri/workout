import { z } from "zod";
import { InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { PlanRepository } from "./plan-repository";
import type { Workout } from "./plan-types";
import type { WorkoutEditRepository } from "./workout-edit-repository";
import { workoutEditInputSchema, type EditedExercise } from "./workout-edit-schema";

export interface WorkoutEditService {
  saveWorkoutExercises(userId: string, workoutId: string, rawInput: unknown): Promise<{ workoutId: string }>;
}

const workoutIdSchema = z.uuid();

function parseInput(workoutId: string, rawInput: unknown) {
  const id = workoutIdSchema.safeParse(workoutId);
  const body = workoutEditInputSchema.safeParse(rawInput);
  if (!id.success || !body.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return { workoutId: id.data, exercises: body.data.exercises };
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/** Kept items must belong to this workout; a kept id with another exercise becomes a new item. */
function normalizeExercises(workout: Workout, exercises: readonly EditedExercise[]): EditedExercise[] {
  const keptIds = exercises.flatMap((exercise) => (exercise.id ? [exercise.id] : []));
  if (hasDuplicates(exercises.map((exercise) => exercise.exerciseSlug)) || hasDuplicates(keptIds)) {
    throw new UnprocessableError(translate("planEdit.duplicateExercise"));
  }
  return exercises.map((exercise) => {
    if (!exercise.id) return exercise;
    const current = workout.exercises.find((item) => item.id === exercise.id);
    if (!current) throw new UnprocessableError(translate("planEdit.exercisesMismatch"));
    return current.exercise.slug === exercise.exerciseSlug ? exercise : { ...exercise, id: null };
  });
}

export function createWorkoutEditService(planRepository: PlanRepository, repository: WorkoutEditRepository): WorkoutEditService {
  return {
    async saveWorkoutExercises(userId, rawWorkoutId, rawInput) {
      const { workoutId, exercises } = parseInput(rawWorkoutId, rawInput);
      const plan = await planRepository.findActivePlan(userId);
      const workout = plan?.workouts.find((candidate) => candidate.id === workoutId);
      if (!workout) throw new NotFoundError(translate("errors.notFound", { resource: translate("training.workoutResource") }));
      await repository.saveWorkoutExercises(workoutId, normalizeExercises(workout, exercises));
      return { workoutId };
    },
  };
}
