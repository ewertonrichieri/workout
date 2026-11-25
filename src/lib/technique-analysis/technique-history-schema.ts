import { z } from "zod";
import { TECHNIQUE_ISSUES } from "@/lib/constants/technique-rules";

/** One saved analysis as the history lists it (step 5.5). */
export const techniqueHistoryItemSchema = z.object({
  id: z.uuid(),
  createdAt: z.string(),
  overallScore: z.number().int(),
  repCount: z.number().int(),
  evaluatedRepCount: z.number().int(),
  mainTip: z.string(),
  /** Errors and warnings only, most frequent first (how many reps had each). */
  frequentIssues: z.array(z.object({ issue: z.enum(TECHNIQUE_ISSUES), repCount: z.number().int() })),
});
export type TechniqueHistoryItem = z.infer<typeof techniqueHistoryItemSchema>;

/** API item: plus the calendar date (YYYY-MM-DD) in the app time zone. */
export const techniqueHistoryEntrySchema = techniqueHistoryItemSchema.extend({ date: z.iso.date() });
export type TechniqueHistoryEntry = z.infer<typeof techniqueHistoryEntrySchema>;
