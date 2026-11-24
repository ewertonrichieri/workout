import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { FinishWorkoutInput } from "./session-schema";

export interface SessionRepository {
  /** Saves the session and its sets atomically; returns the new session id. */
  finishSession(input: FinishWorkoutInput): Promise<string>;
}

const FINISH_FUNCTION = "finish_workout_session";
const sessionIdSchema = z.uuid();

function toSetRows(input: FinishWorkoutInput) {
  return input.sets.map((set) => ({
    workout_exercise_id: set.workoutExerciseId,
    set_number: set.setNumber,
    reps_done: set.repsDone,
    load_kg: set.loadKg,
    effort: set.effort ?? null,
  }));
}

/** Writes through the user's Supabase session (RLS applies inside the function). */
export function createSupabaseSessionRepository(client: SupabaseClient): SessionRepository {
  return {
    async finishSession(input) {
      const { data, error } = await client.rpc(FINISH_FUNCTION, {
        p_workout_id: input.workoutId,
        p_started_at: input.startedAt,
        p_sets: toSetRows(input),
        p_readiness_checkin_id: input.readinessCheckinId ?? null,
      });
      const sessionId = sessionIdSchema.safeParse(data);
      if (error || !sessionId.success) throw new RepositoryError(translate("errors.internal"), "sessions.finishSession");
      return sessionId.data;
    },
  };
}
