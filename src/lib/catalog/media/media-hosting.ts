import { z } from "zod";
import { CATALOG_SOURCES } from "../catalog-sources";

const sourceHostingSchema = z.object({
  license: z.string().trim().min(1),
  /** Base display priority (lower first); later media of the same source get +1 each. */
  priority: z.number().int().nonnegative(),
  /** Repository served by the CDN, pinned to a commit so files never change underneath. */
  repository: z
    .object({ name: z.string().regex(/^[\w.-]+\/[\w.-]+$/), commit: z.string().regex(/^[0-9a-f]{6,40}$/) })
    .optional(),
});

/** Curated media hosting and licensing per source (seed-data/catalog/media-hosting.json). */
export const mediaHostingSchema = z.object({
  cdnBaseUrl: z.url(),
  sources: z.object({
    [CATALOG_SOURCES.workoutFreeVideos]: sourceHostingSchema,
    [CATALOG_SOURCES.freeExerciseDb]: sourceHostingSchema,
    [CATALOG_SOURCES.exerciseLibrary]: sourceHostingSchema,
  }),
});

export type MediaHosting = z.infer<typeof mediaHostingSchema>;
export type SourceHosting = z.infer<typeof sourceHostingSchema>;
