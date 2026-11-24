import { z } from "zod";
import { CATALOG_SOURCE_VALUES, EXERCISE_DIFFICULTIES } from "./catalog-sources";
import { remoteMediaSchema, repositoryMediaSchema } from "./source-exercise";

const sourceField = { source: z.enum(CATALOG_SOURCE_VALUES) };
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const catalogMediaSchema = z.discriminatedUnion("location", [
  remoteMediaSchema.extend(sourceField),
  repositoryMediaSchema.extend(sourceField),
]);

/** One canonical exercise of the unified catalog (output of step 1.3, input of the seed). */
export const catalogExerciseSchema = z.object({
  slug: slugSchema,
  nameEn: z.string().trim().min(1),
  /** Curated pt-BR name; `null` while not translated (never machine-guessed). */
  namePt: z.string().trim().min(1).nullable(),
  difficulty: z.enum(EXERCISE_DIFFICULTIES).nullable(),
  instructionStepsEn: z.array(z.string().trim().min(1)),
  primaryMuscles: z.array(slugSchema),
  secondaryMuscles: z.array(slugSchema),
  equipment: z.array(slugSchema).min(1),
  sourceRefs: z.array(z.object({ ...sourceField, externalId: z.string().min(1) })).min(1),
  media: z.array(catalogMediaSchema).min(1),
});

export type CatalogMedia = z.infer<typeof catalogMediaSchema>;
export type CatalogExercise = z.infer<typeof catalogExerciseSchema>;
