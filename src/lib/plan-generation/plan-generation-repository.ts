import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { PlanGoal } from "@/lib/training/plan-types";
import type { GeneratedPlan } from "./generated-plan-schema";
import type { PlanCandidate } from "./plan-candidate";

export interface NewGeneratedPlan {
  assessmentId: string;
  goal: PlanGoal;
  /** ISO calendar dates (YYYY-MM-DD). */
  startsOn: string;
  validUntil: string;
  replaceActivePlan: boolean;
  plan: GeneratedPlan;
}

export interface PlanGenerationRepository {
  listCandidates(equipmentSlugs: readonly string[]): Promise<PlanCandidate[]>;
  /** Archives the active plan (when confirmed) and saves the new one atomically; returns its id. */
  createGeneratedPlan(input: NewGeneratedPlan): Promise<string>;
}

/** SQLSTATE raised by create_generated_plan when an active plan exists without confirmation. */
const ACTIVE_PLAN_EXISTS_CODE = "WK001";

const candidateRowsSchema = z.array(z.object({ slug: z.string(), primary_muscles: z.array(z.string()), equipment: z.array(z.string()) }));
const planIdSchema = z.uuid();

function toWorkoutRows(plan: GeneratedPlan) {
  return plan.workouts.map((workout) => ({
    label: workout.label,
    exercises: workout.exercises.map((exercise) => ({
      exercise_slug: exercise.exerciseSlug,
      category: exercise.category,
      sets: exercise.sets,
      reps_min: exercise.repsMin,
      reps_max: exercise.repsMax,
      rest_seconds: exercise.restSeconds,
      notes: exercise.notes,
    })),
  }));
}

function toCreateParameters(input: NewGeneratedPlan) {
  return {
    p_assessment_id: input.assessmentId,
    p_goal: input.goal,
    p_starts_on: input.startsOn,
    p_valid_until: input.validUntil,
    p_replace_active: input.replaceActivePlan,
    p_workouts: toWorkoutRows(input.plan),
  };
}

/** Reads and writes through the user's Supabase session (RLS applies inside the functions). */
export function createSupabasePlanGenerationRepository(client: SupabaseClient): PlanGenerationRepository {
  return {
    async listCandidates(equipmentSlugs) {
      const { data, error } = await client.rpc("list_plan_candidates", { p_equipment_slugs: equipmentSlugs });
      const rows = candidateRowsSchema.safeParse(data);
      if (error || !rows.success) throw new RepositoryError(translate("errors.internal"), "plans.listCandidates");
      return rows.data.map((row) => ({ slug: row.slug, primaryMuscles: row.primary_muscles, equipment: row.equipment }));
    },
    async createGeneratedPlan(input) {
      const { data, error } = await client.rpc("create_generated_plan", toCreateParameters(input));
      if (error?.code === ACTIVE_PLAN_EXISTS_CODE) throw new UnprocessableError(translate("planGeneration.activePlanExists"));
      const planId = planIdSchema.safeParse(data);
      if (error || !planId.success) throw new RepositoryError(translate("errors.internal"), "plans.createGeneratedPlan");
      return planId.data;
    },
  };
}
