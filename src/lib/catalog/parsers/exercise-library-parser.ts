import { z } from "zod";
import { CATALOG_SOURCES } from "../catalog-sources";
import { repairMojibake } from "../normalization/text-normalization";
import type { SourceExercise } from "../source-exercise";
import { parseSourceItems, type ParsedSource } from "./parse-source-items";

const GIF_DIRECTORY = "gifs";
const NUMBERED_STEP_PREFIX = /^Step:\s*\d+\s*/i;

const rawExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  gif: z.string(),
  targetMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.array(z.string()),
  instructions: z.array(z.string()).default([]),
});

type RawExercise = z.infer<typeof rawExerciseSchema>;

function mapExercise(raw: RawExercise): SourceExercise {
  return {
    source: CATALOG_SOURCES.exerciseLibrary,
    externalId: raw.id,
    nameEn: repairMojibake(raw.name),
    aliases: [],
    primaryMuscles: raw.targetMuscles,
    secondaryMuscles: raw.secondaryMuscles,
    equipment: raw.equipment,
    instructionSteps: raw.instructions.map((step) => step.replace(NUMBERED_STEP_PREFIX, "")),
    media: [{ location: "repository_path", mediaType: "gif", path: `${GIF_DIRECTORY}/${raw.gif}` }],
  };
}

/** Parses `exercises.json` from Exercise Library. */
export function parseExerciseLibrary(rawSource: unknown): ParsedSource {
  return parseSourceItems(rawSource, rawExerciseSchema, mapExercise);
}
