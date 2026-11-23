import { z } from "zod";
import { CATALOG_SOURCES, EXERCISE_DIFFICULTIES } from "../catalog-sources";
import type { SourceExercise } from "../source-exercise";
import { parseSourceItems, type ParsedSource } from "./parse-source-items";

const rawExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryMuscle: z.string(),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.array(z.string()),
  level: z.enum(EXERCISE_DIFFICULTIES),
  cues: z.array(z.string()).default([]),
  video: z.object({ path: z.string() }),
});

type RawExercise = z.infer<typeof rawExerciseSchema>;

function mapExercise(raw: RawExercise): SourceExercise {
  return {
    source: CATALOG_SOURCES.workoutFreeVideos,
    externalId: raw.id,
    nameEn: raw.name,
    aliases: [],
    primaryMuscles: [raw.primaryMuscle],
    secondaryMuscles: raw.secondaryMuscles,
    equipment: raw.equipment,
    difficulty: raw.level,
    instructionSteps: raw.cues,
    media: [{ location: "repository_path", mediaType: "video", path: raw.video.path }],
  };
}

/** Parses `data/exercises.json` from Workout Free Videos. */
export function parseWorkoutFreeVideos(rawSource: unknown): ParsedSource {
  return parseSourceItems(rawSource, rawExerciseSchema, mapExercise);
}
