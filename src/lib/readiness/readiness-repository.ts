import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { ReadinessCheckinInput } from "./readiness-schema";

export interface ReadinessRepository {
  /** Saves the check-in and its pains atomically; returns the new check-in id. */
  saveCheckin(input: ReadinessCheckinInput): Promise<string>;
}

const SAVE_FUNCTION = "save_readiness_checkin";
const checkinIdSchema = z.uuid();

function toSaveParameters(input: ReadinessCheckinInput) {
  return {
    p_workout_id: input.workoutId,
    p_sleep_quality: input.sleepQuality,
    p_energy_level: input.energyLevel,
    p_available_minutes: input.availableMinutes,
    p_pains: input.pains.map((pain) => ({ body_region: pain.bodyRegion, intensity: pain.intensity })),
  };
}

/** Writes through the user's Supabase session (RLS applies inside the function). */
export function createSupabaseReadinessRepository(client: SupabaseClient): ReadinessRepository {
  return {
    async saveCheckin(input) {
      const { data, error } = await client.rpc(SAVE_FUNCTION, toSaveParameters(input));
      const checkinId = checkinIdSchema.safeParse(data);
      if (error || !checkinId.success) throw new RepositoryError(translate("errors.internal"), "readiness.saveCheckin");
      return checkinId.data;
    },
  };
}
