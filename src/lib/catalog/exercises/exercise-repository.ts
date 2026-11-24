import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import { EXERCISE_COLUMNS, mapExerciseRow, mapTermRow, termRowSchema } from "./exercise-row-mapping";
import type { ExerciseSearchCriteria } from "./exercise-search-schema";
import type { CatalogTerm, ExerciseDetail, ExerciseSummary } from "./exercise-types";

export interface ExerciseRepository {
  search(criteria: ExerciseSearchCriteria): Promise<{ items: ExerciseSummary[]; total: number }>;
  findBySlug(slug: string): Promise<ExerciseDetail | null>;
  listMuscles(): Promise<CatalogTerm[]>;
  listEquipment(): Promise<CatalogTerm[]>;
}

const searchResultSchema = z.array(z.object({ id: z.uuid(), total_count: z.coerce.number() }));

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

function unwrap(result: QueryResult, operation: string): unknown {
  if (result.error) throw new RepositoryError(translate("errors.internal"), operation);
  return result.data;
}

/** Catalog reads through the user's Supabase session (RLS applies). */
export function createSupabaseExerciseRepository(client: SupabaseClient): ExerciseRepository {
  async function fetchByIds(ids: string[]): Promise<ExerciseSummary[]> {
    if (ids.length === 0) return [];
    const rows = unwrap(await client.from("exercises").select(EXERCISE_COLUMNS).in("id", ids), "exercises.fetchByIds");
    const byId = new Map(z.array(z.unknown()).parse(rows).map(mapExerciseRow).map((exercise) => [exercise.id, exercise]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async function listTerms(table: "muscles" | "equipment"): Promise<CatalogTerm[]> {
    const rows = unwrap(await client.from(table).select("slug, name_pt").order("name_pt"), `${table}.list`);
    return z.array(termRowSchema).parse(rows).map(mapTermRow);
  }

  return {
    async search({ query, muscle, equipment, page, pageSize }) {
      const result = await client.rpc("search_exercises", {
        search_text: query ?? null,
        muscle_slug: muscle ?? null,
        equipment_slug: equipment ?? null,
        page_limit: pageSize,
        page_offset: (page - 1) * pageSize,
      });
      const matches = searchResultSchema.parse(unwrap(result, "exercises.search"));
      return { items: await fetchByIds(matches.map((match) => match.id)), total: matches[0]?.total_count ?? 0 };
    },
    async findBySlug(slug) {
      const row = unwrap(await client.from("exercises").select(EXERCISE_COLUMNS).eq("slug", slug).maybeSingle(), "exercises.findBySlug");
      return row === null ? null : mapExerciseRow(row);
    },
    listMuscles: () => listTerms("muscles"),
    listEquipment: () => listTerms("equipment"),
  };
}
