import { z } from "zod";
import { CATALOG_SOURCES, EXERCISE_DIFFICULTIES, VIDEO_VARIANTS } from "../catalog-sources";
import type { SourceExercise, SourceMedia } from "../source-exercise";
import { parseSourceItems, type ParsedSource } from "./parse-source-items";

const variantUrlsSchema = z.object({ male: z.url().optional(), female: z.url().optional() });

const rawExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  target: z.string(),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.string(),
  difficulty: z.enum(EXERCISE_DIFFICULTIES),
  instructions: z.string().default(""),
  steps: z.array(z.string()).default([]),
  videos: variantUrlsSchema,
  thumbnails: variantUrlsSchema.default({}),
});

type RawExercise = z.infer<typeof rawExerciseSchema>;

function buildVideoMedia(raw: RawExercise): SourceMedia[] {
  return VIDEO_VARIANTS.flatMap((variant) => {
    const url = raw.videos[variant];
    if (!url) return [];
    const thumbnailUrl = raw.thumbnails[variant];
    return [{ location: "url" as const, mediaType: "video" as const, variant, url, ...(thumbnailUrl && { thumbnailUrl }) }];
  });
}

function mapExercise(raw: RawExercise): SourceExercise {
  return {
    source: CATALOG_SOURCES.freeExerciseDb,
    externalId: raw.id,
    nameEn: raw.name,
    aliases: raw.aliases,
    primaryMuscles: [raw.target],
    secondaryMuscles: raw.secondaryMuscles,
    equipment: [raw.equipment],
    difficulty: raw.difficulty,
    instructionSteps: raw.steps.length > 0 ? raw.steps : [raw.instructions],
    media: buildVideoMedia(raw),
  };
}

/** Parses `data/exercises.json` from Free Exercise DB with Videos. */
export function parseFreeExerciseDb(rawSource: unknown): ParsedSource {
  return parseSourceItems(rawSource, rawExerciseSchema, mapExercise);
}
