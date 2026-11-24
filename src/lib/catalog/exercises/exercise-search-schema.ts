import { z } from "zod";
import {
  EXERCISE_PAGE_SIZE_DEFAULT,
  EXERCISE_PAGE_SIZE_MAX,
  EXERCISE_SEARCH_MAX_LENGTH,
  SLUG_PATTERN,
} from "@/lib/constants/catalog";

/** Empty form fields (`?muscle=`) mean "no filter". */
function optionalField<Schema extends z.ZodType>(schema: Schema) {
  return z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema.optional());
}

/** Query parameters of the exercise search (`q`, `muscle`, `equipment`, `page`, `pageSize`). */
export const exerciseSearchSchema = z
  .object({
    q: optionalField(z.string().trim().max(EXERCISE_SEARCH_MAX_LENGTH)),
    muscle: optionalField(z.string().regex(SLUG_PATTERN)),
    equipment: optionalField(z.string().regex(SLUG_PATTERN)),
    page: optionalField(z.coerce.number().int().min(1)),
    pageSize: optionalField(z.coerce.number().int().min(1).max(EXERCISE_PAGE_SIZE_MAX)),
  })
  .transform(({ q, muscle, equipment, page, pageSize }) => ({
    ...(q && { query: q }),
    ...(muscle && { muscle }),
    ...(equipment && { equipment }),
    page: page ?? 1,
    pageSize: pageSize ?? EXERCISE_PAGE_SIZE_DEFAULT,
  }));

export type ExerciseSearchCriteria = z.output<typeof exerciseSearchSchema>;
