import { z } from "zod";
import {
  EXERCISE_MEDIA_COLUMNS,
  exerciseMediaRowSchema,
  mapEnabledMedia,
} from "@/lib/catalog/exercises/exercise-row-mapping";
import { PLAN_GOALS, PLAN_ORIGINS } from "@/lib/constants/training";
import type { ActivePlan, PlannedExerciseInfo, Workout, WorkoutExercise } from "./plan-types";

/** Columns selected for the active plan with its workouts, prescriptions and exercise media. */
const WORKOUT_EXERCISE_COLUMNS = "id, position, category, sets, reps_min, reps_max, rest_seconds, notes, track_progression";
export const PLANNED_EXERCISE_COLUMNS = `id, slug, name_pt, exercise_media(${EXERCISE_MEDIA_COLUMNS})`;
export const ACTIVE_PLAN_COLUMNS =
  `id, goal, origin, starts_on, valid_until, ` +
  `workouts(id, label, position, workout_exercises(${WORKOUT_EXERCISE_COLUMNS}, exercises(${PLANNED_EXERCISE_COLUMNS})))`;

export const plannedExerciseRowSchema = z.object({ id: z.uuid(), slug: z.string(), name_pt: z.string(), exercise_media: z.array(exerciseMediaRowSchema) });

/** Exercise shown in a workout card: enabled media only, best priority first. */
export function mapPlannedExercise(row: z.infer<typeof plannedExerciseRowSchema>): PlannedExerciseInfo {
  const media = mapEnabledMedia(row.exercise_media);
  return { id: row.id, slug: row.slug, name: row.name_pt, media, coverMedia: media[0] ?? null };
}

const workoutExerciseRowSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  category: z.string().nullable(),
  sets: z.number().int(),
  reps_min: z.number().int(),
  reps_max: z.number().int(),
  rest_seconds: z.number().int().nullable(),
  notes: z.string().nullable(),
  track_progression: z.boolean(),
  exercises: plannedExerciseRowSchema,
});

const planRowSchema = z.object({
  id: z.uuid(),
  goal: z.enum(PLAN_GOALS),
  origin: z.enum(PLAN_ORIGINS),
  starts_on: z.iso.date(),
  valid_until: z.iso.date(),
  workouts: z.array(z.object({ id: z.uuid(), label: z.string(), position: z.number().int(), workout_exercises: z.array(workoutExerciseRowSchema) })),
});

const byPosition = (left: { position: number }, right: { position: number }) => left.position - right.position;

function mapWorkoutExercise(row: z.infer<typeof workoutExerciseRowSchema>): WorkoutExercise {
  return {
    id: row.id,
    position: row.position,
    category: row.category,
    sets: row.sets,
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    restSeconds: row.rest_seconds,
    notes: row.notes,
    trackProgression: row.track_progression,
    exercise: mapPlannedExercise(row.exercises),
  };
}

/** Validates the active plan row (never trusted blindly) and maps it, ordered by position. */
export function mapActivePlanRow(rawRow: unknown): ActivePlan {
  const row = planRowSchema.parse(rawRow);
  const workouts: Workout[] = [...row.workouts].sort(byPosition).map((workout) => ({
    id: workout.id,
    label: workout.label,
    position: workout.position,
    exercises: workout.workout_exercises.map(mapWorkoutExercise).sort(byPosition),
  }));
  return { id: row.id, goal: row.goal, origin: row.origin, startsOn: row.starts_on, validUntil: row.valid_until, workouts };
}
