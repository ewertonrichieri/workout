import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { LatestSetLoad } from "./suggested-loads";

export interface ProgressionRepository {
  findLatestSetLoads(exerciseIds: readonly string[]): Promise<LatestSetLoad[]>;
}

const LATEST_LOADS_FUNCTION = "latest_set_loads";

/** `numeric` may arrive as number or string; either way it must be a finite number. */
const numericSchema = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().nonnegative());
const latestLoadRowsSchema = z.array(z.object({ exercise_id: z.uuid(), set_number: z.number().int().positive(), load_kg: numericSchema, reps_done: z.number().int().nonnegative().nullable() }));

export function createSupabaseProgressionRepository(client: SupabaseClient): ProgressionRepository {
  return {
    async findLatestSetLoads(exerciseIds) {
      if (exerciseIds.length === 0) return [];
      const { data, error } = await client.rpc(LATEST_LOADS_FUNCTION, { p_exercise_ids: exerciseIds });
      const rows = latestLoadRowsSchema.safeParse(data);
      if (error || !rows.success) throw new RepositoryError(translate("errors.internal"), "progression.findLatestSetLoads");
      return rows.data.map((row) => ({ exerciseId: row.exercise_id, setNumber: row.set_number, loadKg: row.load_kg, repsDone: row.reps_done }));
    },
  };
}
