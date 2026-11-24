import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { SubstitutionProfile } from "./substitution-schema";

export interface SubstitutionOptions {
  /** Null when the planned exercise is not in the catalog any more. */
  original: SubstitutionProfile | null;
  candidates: SubstitutionProfile[];
}

export interface SubstitutionRepository {
  /** Exercises with media sharing a primary muscle with the original, using only the given equipment. */
  listCandidates(originalSlug: string, equipmentSlugs: readonly string[]): Promise<SubstitutionOptions>;
}

const profileRowSchema = z.object({
  slug: z.string(),
  primary_muscles: z.array(z.string()),
  secondary_muscles: z.array(z.string()),
  equipment: z.array(z.string()),
});
const optionsSchema = z.object({ original: profileRowSchema.nullable(), candidates: z.array(profileRowSchema) });

function mapProfile(row: z.infer<typeof profileRowSchema>): SubstitutionProfile {
  return { slug: row.slug, primaryMuscles: row.primary_muscles, secondaryMuscles: row.secondary_muscles, equipment: row.equipment };
}

/** Reads through the user's Supabase session (catalog RLS applies). */
export function createSupabaseSubstitutionRepository(client: SupabaseClient): SubstitutionRepository {
  return {
    async listCandidates(originalSlug, equipmentSlugs) {
      const { data, error } = await client.rpc("list_substitution_candidates", { p_original_slug: originalSlug, p_equipment_slugs: equipmentSlugs });
      const options = optionsSchema.safeParse(data);
      if (error || !options.success) throw new RepositoryError(translate("errors.internal"), "substitutions.listCandidates");
      return { original: options.data.original ? mapProfile(options.data.original) : null, candidates: options.data.candidates.map(mapProfile) };
    },
  };
}
