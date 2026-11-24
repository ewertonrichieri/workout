import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ADJUSTMENT_CHANGE_TYPES, BODY_REGIONS, ENERGY_LEVELS, PAIN_INTENSITIES, SLEEP_QUALITIES } from "@/lib/constants/readiness";
import { RepositoryError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { PlanCandidate } from "@/lib/plan-generation/plan-candidate";
import { mapPlannedExercise, PLANNED_EXERCISE_COLUMNS, plannedExerciseRowSchema } from "@/lib/training/plan-row-mapping";
import type { PlannedExerciseInfo } from "@/lib/training/plan-types";
import type { AdjustmentChange } from "./adjustment-schema";
import type { ReportedPain } from "./readiness-schema";

/** A saved check-in as the adjustment needs it (step 3B.2). */
export interface StoredCheckin {
  id: string;
  workoutId: string | null;
  sleepQuality: (typeof SLEEP_QUALITIES)[number];
  energyLevel: (typeof ENERGY_LEVELS)[number];
  availableMinutes: number;
  createdAt: string;
  pains: ReportedPain[];
  /** A finished session already points to this check-in: nothing changes any more. */
  hasFinishedSession: boolean;
}

/** The AI's proposal saved for a check-in (already validated), so asking again never calls the AI. */
export interface StoredAdjustmentProposal {
  summary: string;
  estimatedMinutes: number;
  changes: AdjustmentChange[];
}

export interface AdjustmentRepository {
  findCheckin(checkinId: string, userId: string): Promise<StoredCheckin | null>;
  /** Primary muscles and equipment of the given exercises. */
  listExerciseProfiles(slugs: readonly string[]): Promise<PlanCandidate[]>;
  findExercisesBySlugs(slugs: readonly string[]): Promise<PlannedExerciseInfo[]>;
  /** Replaces every adjustment of the check-in atomically ([] restores the original workout). */
  saveAdjustments(checkinId: string, changes: readonly AdjustmentChange[]): Promise<void>;
  findProposal(checkinId: string): Promise<StoredAdjustmentProposal | null>;
  /** Saves the proposal atomically; a check-in keeps its first proposal. */
  saveProposal(checkinId: string, proposal: StoredAdjustmentProposal): Promise<void>;
}

/** SQLSTATE raised by save_session_adjustments when the workout was already finished. */
const ALREADY_FINISHED_CODE = "WK002";
const CHECKIN_COLUMNS =
  "id, workout_id, sleep_quality, energy_level, available_minutes, created_at, readiness_checkin_pains(body_region, intensity), workout_sessions(id)";

const sessionRefSchema = z.object({ id: z.string() });
const checkinRowSchema = z.object({
  id: z.uuid(),
  workout_id: z.uuid().nullable(),
  sleep_quality: z.enum(SLEEP_QUALITIES),
  energy_level: z.enum(ENERGY_LEVELS),
  available_minutes: z.number().int(),
  created_at: z.string(),
  readiness_checkin_pains: z.array(z.object({ body_region: z.enum(BODY_REGIONS), intensity: z.enum(PAIN_INTENSITIES) })),
  // One-to-one embeds may come as an object (unique FK) or as a list, depending on the API version.
  workout_sessions: z.union([z.array(sessionRefSchema), sessionRefSchema]).nullable(),
});
const PROPOSAL_COLUMNS =
  "summary, estimated_minutes, adjustment_proposal_changes(workout_exercise_id, change_type, sets, reps_min, reps_max, reason, replacement:exercises(slug))";
const proposalRowSchema = z.object({
  summary: z.string(),
  estimated_minutes: z.number().int(),
  adjustment_proposal_changes: z.array(z.object({
    workout_exercise_id: z.uuid(),
    change_type: z.enum(ADJUSTMENT_CHANGE_TYPES),
    sets: z.number().int().nullable(),
    reps_min: z.number().int().nullable(),
    reps_max: z.number().int().nullable(),
    reason: z.string(),
    replacement: z.object({ slug: z.string() }).nullable(),
  })),
});
const profileRowsSchema = z.array(z.object({ slug: z.string(), primary_muscles: z.array(z.string()), equipment: z.array(z.string()) }));
const exerciseRowsSchema = z.array(plannedExerciseRowSchema);

function hasSession(sessions: z.infer<typeof checkinRowSchema>["workout_sessions"]): boolean {
  if (sessions === null) return false;
  return Array.isArray(sessions) ? sessions.length > 0 : true;
}

function mapCheckinRow(row: z.infer<typeof checkinRowSchema>): StoredCheckin {
  return {
    id: row.id,
    workoutId: row.workout_id,
    sleepQuality: row.sleep_quality,
    energyLevel: row.energy_level,
    availableMinutes: row.available_minutes,
    createdAt: row.created_at,
    pains: row.readiness_checkin_pains.map((pain) => ({ bodyRegion: pain.body_region, intensity: pain.intensity })),
    hasFinishedSession: hasSession(row.workout_sessions),
  };
}

function mapProposalRow(row: z.infer<typeof proposalRowSchema>): StoredAdjustmentProposal {
  return {
    summary: row.summary,
    estimatedMinutes: row.estimated_minutes,
    changes: row.adjustment_proposal_changes.map((change) => ({
      workoutExerciseId: change.workout_exercise_id,
      changeType: change.change_type,
      replacementSlug: change.replacement?.slug ?? null,
      sets: change.sets,
      repsMin: change.reps_min,
      repsMax: change.reps_max,
      reason: change.reason,
    })),
  };
}

function toChangeRows(changes: readonly AdjustmentChange[]) {
  return changes.map((change) => ({
    workout_exercise_id: change.workoutExerciseId,
    change_type: change.changeType,
    replacement_slug: change.replacementSlug,
    sets: change.sets,
    reps_min: change.repsMin,
    reps_max: change.repsMax,
    reason: change.reason,
  }));
}

function failure(operation: string): RepositoryError {
  return new RepositoryError(translate("errors.internal"), operation);
}

/** Reads and writes through the user's Supabase session (RLS applies; reads also filter by owner). */
export function createSupabaseAdjustmentRepository(client: SupabaseClient): AdjustmentRepository {
  return {
    async findCheckin(checkinId, userId) {
      const { data, error } = await client.from("readiness_checkins").select(CHECKIN_COLUMNS).eq("id", checkinId).eq("user_id", userId).maybeSingle();
      if (error) throw failure("adjustments.findCheckin");
      if (data === null) return null;
      const row = checkinRowSchema.safeParse(data);
      if (!row.success) throw failure("adjustments.findCheckin");
      return mapCheckinRow(row.data);
    },
    async listExerciseProfiles(slugs) {
      if (slugs.length === 0) return [];
      const { data, error } = await client.rpc("list_exercise_profiles", { p_slugs: slugs });
      const rows = profileRowsSchema.safeParse(data);
      if (error || !rows.success) throw failure("adjustments.listExerciseProfiles");
      return rows.data.map((row) => ({ slug: row.slug, primaryMuscles: row.primary_muscles, equipment: row.equipment }));
    },
    async findExercisesBySlugs(slugs) {
      if (slugs.length === 0) return [];
      const { data, error } = await client.from("exercises").select(PLANNED_EXERCISE_COLUMNS).in("slug", slugs);
      const rows = exerciseRowsSchema.safeParse(data);
      if (error || !rows.success) throw failure("adjustments.findExercisesBySlugs");
      return rows.data.map(mapPlannedExercise);
    },
    async saveAdjustments(checkinId, changes) {
      const { error } = await client.rpc("save_session_adjustments", { p_checkin_id: checkinId, p_changes: toChangeRows(changes) });
      if (error?.code === ALREADY_FINISHED_CODE) throw new UnprocessableError(translate("readiness.adjustment.alreadyFinished"));
      if (error) throw failure("adjustments.saveAdjustments");
    },
    async findProposal(checkinId) {
      const { data, error } = await client.from("adjustment_proposals").select(PROPOSAL_COLUMNS).eq("checkin_id", checkinId).maybeSingle();
      if (error) throw failure("adjustments.findProposal");
      if (data === null) return null;
      const row = proposalRowSchema.safeParse(data);
      if (!row.success) throw failure("adjustments.findProposal");
      return mapProposalRow(row.data);
    },
    async saveProposal(checkinId, proposal) {
      const { error } = await client.rpc("save_adjustment_proposal", {
        p_checkin_id: checkinId,
        p_summary: proposal.summary,
        p_estimated_minutes: proposal.estimatedMinutes,
        p_changes: toChangeRows(proposal.changes),
      });
      if (error) throw failure("adjustments.saveProposal");
    },
  };
}
