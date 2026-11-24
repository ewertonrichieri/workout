import { z } from "zod";
import { EXERCISE_DIFFICULTIES } from "../catalog-sources";
import type { CatalogTerm, ExerciseDetail, ExerciseMediaItem } from "./exercise-types";

/** Columns of `exercise_media` matching `exerciseMediaRowSchema`. */
export const EXERCISE_MEDIA_COLUMNS = "media_type, url, thumbnail_url, source, license, priority, is_enabled";

/** Columns selected for every exercise read (kept next to the schema that validates them). */
export const EXERCISE_COLUMNS = [
  "id, slug, name_pt, name_en, difficulty, instructions_pt",
  "exercise_muscles(muscle_role, muscles(slug, name_pt))",
  "exercise_equipment(equipment(slug, name_pt))",
  `exercise_media(${EXERCISE_MEDIA_COLUMNS})`,
].join(", ");

export const termRowSchema = z.object({ slug: z.string(), name_pt: z.string() });

/** One `exercise_media` row as selected by the catalog and plan queries. */
export const exerciseMediaRowSchema = z.object({
  media_type: z.enum(["video", "gif", "image", "youtube"]),
  url: z.string(),
  thumbnail_url: z.string().nullable(),
  source: z.string(),
  license: z.string(),
  priority: z.number(),
  is_enabled: z.boolean(),
});

const exerciseRowSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name_pt: z.string(),
  name_en: z.string().nullable(),
  difficulty: z.enum(EXERCISE_DIFFICULTIES).nullable(),
  instructions_pt: z.string().nullable(),
  exercise_muscles: z.array(z.object({ muscle_role: z.enum(["primary", "secondary"]), muscles: termRowSchema })),
  exercise_equipment: z.array(z.object({ equipment: termRowSchema })),
  exercise_media: z.array(exerciseMediaRowSchema),
});

type ExerciseRow = z.infer<typeof exerciseRowSchema>;

export function mapTermRow(row: z.infer<typeof termRowSchema>): CatalogTerm {
  return { slug: row.slug, name: row.name_pt };
}

function musclesWithRole(row: ExerciseRow, role: "primary" | "secondary"): CatalogTerm[] {
  return row.exercise_muscles.filter((link) => link.muscle_role === role).map((link) => mapTermRow(link.muscles));
}

/** Enabled media only, best (lowest priority) first. */
export function mapEnabledMedia(rows: readonly z.infer<typeof exerciseMediaRowSchema>[]): ExerciseMediaItem[] {
  return rows
    .filter((media) => media.is_enabled)
    .sort((left, right) => left.priority - right.priority)
    .map((media) => ({
      mediaType: media.media_type,
      url: media.url,
      thumbnailUrl: media.thumbnail_url,
      source: media.source,
      license: media.license,
    }));
}

/** Validates a database row (never trusted blindly) and maps it to the domain shape. */
export function mapExerciseRow(rawRow: unknown): ExerciseDetail {
  const row = exerciseRowSchema.parse(rawRow);
  const media = mapEnabledMedia(row.exercise_media);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name_pt,
    nameEn: row.name_en,
    difficulty: row.difficulty,
    instructions: row.instructions_pt,
    primaryMuscles: musclesWithRole(row, "primary"),
    secondaryMuscles: musclesWithRole(row, "secondary"),
    equipment: row.exercise_equipment.map((link) => mapTermRow(link.equipment)),
    media,
    coverMedia: media[0] ?? null,
  };
}
