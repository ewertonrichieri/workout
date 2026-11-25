import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

/** One exercise the AI chose for a swap, best first. */
export interface CachedSubstitutionChoice {
  slug: string;
  reason: string;
}

/** The AI's swap choices kept per user and per exact AI input (SUB-001), so the same swap never pays twice. */
export interface SubstitutionCacheRepository {
  /** Null when nothing is saved for the key. */
  findChoices(cacheKey: string): Promise<CachedSubstitutionChoice[] | null>;
  saveChoices(cacheKey: string, choices: readonly CachedSubstitutionChoice[]): Promise<void>;
}

const cachedRowsSchema = z.array(z.object({ exercise_slug: z.string(), reason: z.string() }));

/** Reads and writes through the user's Supabase session (RLS: only the user's own cache). */
export function createSupabaseSubstitutionCacheRepository(client: SupabaseClient): SubstitutionCacheRepository {
  return {
    async findChoices(cacheKey) {
      const { data, error } = await client.rpc("find_substitution_cache", { p_cache_key: cacheKey });
      const rows = cachedRowsSchema.safeParse(data);
      if (error || !rows.success) throw new RepositoryError(translate("errors.internal"), "substitutions.findCache");
      return rows.data.length > 0 ? rows.data.map((row) => ({ slug: row.exercise_slug, reason: row.reason })) : null;
    },
    async saveChoices(cacheKey, choices) {
      const payload = choices.map((choice) => ({ exercise_slug: choice.slug, reason: choice.reason }));
      const { error } = await client.rpc("save_substitution_cache", { p_cache_key: cacheKey, p_choices: payload });
      if (error) throw new RepositoryError(translate("errors.internal"), "substitutions.saveCache");
    },
  };
}
