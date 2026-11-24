import { z } from "zod";
import {
  EXPERIENCE_LEVELS,
  MAX_ASSESSMENT_EQUIPMENT,
  MAX_DAYS_PER_WEEK,
  MAX_EQUIPMENT_SLUG_LENGTH,
  MAX_LIMITATIONS_LENGTH,
  MAX_SESSION_MINUTES,
  MIN_DAYS_PER_WEEK,
  MIN_SESSION_MINUTES,
  SPLIT_PREFERENCES,
} from "@/lib/constants/assessment";
import { PLAN_GOALS } from "@/lib/constants/training";

const equipmentSlugsSchema = z
  .array(z.string().min(1).max(MAX_EQUIPMENT_SLUG_LENGTH))
  .min(1)
  .max(MAX_ASSESSMENT_EQUIPMENT)
  .refine((slugs) => new Set(slugs).size === slugs.length);

/** Empty or missing text becomes null; the text itself never reaches the logs. */
const limitationsSchema = z
  .string()
  .trim()
  .max(MAX_LIMITATIONS_LENGTH)
  .nullable()
  .transform((text) => (text ? text : null));

/** Body of POST /api/assessments (step 3.1); also drives the field errors of the form. */
export const assessmentInputSchema = z.object({
  goal: z.enum(PLAN_GOALS),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  daysPerWeek: z.number().int().min(MIN_DAYS_PER_WEEK).max(MAX_DAYS_PER_WEEK),
  sessionMinutes: z.number().int().min(MIN_SESSION_MINUTES).max(MAX_SESSION_MINUTES),
  splitPreference: z.enum(SPLIT_PREFERENCES),
  equipmentSlugs: equipmentSlugsSchema,
  limitations: limitationsSchema,
});

export type AssessmentInput = z.output<typeof assessmentInputSchema>;
export type AssessmentField = keyof AssessmentInput;

export interface SavedAssessment extends AssessmentInput {
  id: string;
  createdAt: string;
}

const ASSESSMENT_FIELDS = Object.keys(assessmentInputSchema.shape) as AssessmentField[];

function isAssessmentField(value: unknown): value is AssessmentField {
  return ASSESSMENT_FIELDS.some((field) => field === value);
}

/** Invalid top-level fields, in form order, each listed once. */
export function findAssessmentFieldErrors(error: z.ZodError): AssessmentField[] {
  const invalid = new Set(error.issues.map((issue) => issue.path[0]).filter(isAssessmentField));
  return ASSESSMENT_FIELDS.filter((field) => invalid.has(field));
}
