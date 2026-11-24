import { z } from "zod";
import { EXERCISE_DIFFICULTIES } from "../catalog-sources";
import type { CatalogTerm, ExerciseDetail } from "./exercise-types";

/** Columns selected for every exercise read (kept next to the schema that validates them). */
export const EXERCISE_COLUMNS = [
  "id, slug, name_pt, name_en, difficulty, instructions_pt",
  "exercise_muscles(muscle_role, muscles(slug, name_pt))",
  "exercise_equipment(equipment(slug, name_pt))",
  "exercise_media(media_type, url, thumbnail_url, source, license, priority, is_enabled)",
].join(", ");

export const termRowSchema = z.object({ slug: z.string(), name_pt: z.string() });

const exerciseRowSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name_pt: z.string(),
  name_en: z.string().nullable(),
  difficulty: z.enum(EXERCISE_DIFFICULTIES).nullable(),
  instructions_pt: z.string().nullable(),
  exercise_muscles: z.array(z.object({ muscle_role: z.enum(["primary", "secondary"]), muscles: termRowSchema })),
  exercise_equipment: z.array(z.object({ equipment: termRowSchema })),
  exercise_media: z.array(
    z.object({
      media_type: z.enum(["video", "gif", "image", "youtube"]),
      url: z.string(),
      thumbnail_url: z.string().nullable(),
      source: z.string(),
      license: z.string(),
      priority: z.number(),
      is_enabled: z.boolean(),
    }),
  ),
});

type ExerciseRow = z.infer<typeof exerciseRowSchema>;

export function mapTermRow(row: z.infer<typeof termRowSchema>): CatalogTerm {
  return { slug: row.slug, name: row.name_pt };
}

function musclesWithRole(row: ExerciseRow, role: "primary" | "secondary"): CatalogTerm[] {
  return row.exercise_muscles.filter((link) => link.muscle_role === role).map((link) => mapTermRow(link.muscles));
}

function mapMedia(row: ExerciseRow): ExerciseDetail["media"] {
  return row.exercise_media
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
  const media = mapMedia(row);
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
