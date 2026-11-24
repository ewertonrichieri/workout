import { z } from "zod";
import { EXERCISE_PICKER_PAGE_SIZE } from "@/lib/constants/catalog";
import type { DraftExerciseInfo } from "@/lib/training/workout-edit-draft";

const EXERCISES_ENDPOINT = "/api/exercises";

const searchResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(z.object({ slug: z.string(), name: z.string() })) }),
});

/** Catalog search through the app's own API (only exercises with media); null when it fails. */
export async function searchCatalogExercises(query: string): Promise<DraftExerciseInfo[] | null> {
  const params = new URLSearchParams({ q: query, pageSize: String(EXERCISE_PICKER_PAGE_SIZE) });
  try {
    const response = await fetch(`${EXERCISES_ENDPOINT}?${params}`);
    const parsed = searchResponseSchema.safeParse(await response.json());
    if (!response.ok || !parsed.success) return null;
    return parsed.data.data.items.map((item) => ({ slug: item.slug, name: item.name }));
  } catch (error) {
    // Network failure or a body that is not JSON: the picker shows a retry message.
    if (error instanceof TypeError || error instanceof SyntaxError) return null;
    throw error;
  }
}
