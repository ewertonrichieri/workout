import { z } from "zod";
import { CATALOG_SOURCE_VALUES, EXERCISE_DIFFICULTIES, VIDEO_VARIANTS } from "./catalog-sources";

const nonEmptyText = z.string().trim().min(1);

export const remoteMediaSchema = z.object({
  location: z.literal("url"),
  mediaType: z.enum(["video", "gif"]),
  url: z.url(),
  thumbnailUrl: z.url().optional(),
  variant: z.enum(VIDEO_VARIANTS).optional(),
});

/** Media stored inside the source repository; turned into a CDN URL in step 1.4. */
export const repositoryMediaSchema = z.object({
  location: z.literal("repository_path"),
  mediaType: z.enum(["video", "gif"]),
  path: nonEmptyText.refine((path) => !path.split("/").includes(".."), "path must stay inside the repository"),
});

export const sourceMediaSchema = z.discriminatedUnion("location", [remoteMediaSchema, repositoryMediaSchema]);

/** Exercise extracted from one source, before normalization and translation (step 1.3). */
export const sourceExerciseSchema = z.object({
  source: z.enum(CATALOG_SOURCE_VALUES),
  externalId: nonEmptyText,
  nameEn: nonEmptyText,
  aliases: z.array(nonEmptyText),
  primaryMuscles: z.array(nonEmptyText).min(1),
  secondaryMuscles: z.array(nonEmptyText),
  equipment: z.array(nonEmptyText).min(1),
  difficulty: z.enum(EXERCISE_DIFFICULTIES).optional(),
  instructionSteps: z.array(nonEmptyText),
  media: z.array(sourceMediaSchema).min(1),
});

export type SourceMedia = z.infer<typeof sourceMediaSchema>;
export type SourceExercise = z.infer<typeof sourceExerciseSchema>;
