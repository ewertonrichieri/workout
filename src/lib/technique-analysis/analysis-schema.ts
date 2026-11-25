import { z } from "zod";
import { ISSUE_SEVERITIES, TECHNIQUE_ISSUES } from "@/lib/constants/technique-rules";

/** Structured output asked from Claude: plain fields; bounds are enforced by sanitizeAnalysis. */
export const aiTechniqueAnalysisSchema = z.object({
  overallScore: z.number().int().describe("Score of the whole set from 0 to 10"),
  reps: z.array(z.object({
    repNumber: z.number().int().describe("Number of an evaluated rep"),
    score: z.number().int().describe("Score of this rep from 0 to 10"),
  })),
  strengths: z.array(z.string()).describe("Up to 3 short things done well, in Brazilian Portuguese"),
  corrections: z.array(z.object({
    issue: z.string().describe("Issue code copied exactly from the issue list"),
    repNumbers: z.array(z.number().int()).describe("Reps where it happened"),
    text: z.string().describe("Short explanation and how to fix it, in Brazilian Portuguese"),
  })).describe("Up to 4 corrections, most important first"),
  mainTip: z.string().describe("The one tip for the next set, in Brazilian Portuguese"),
});
export type AiTechniqueAnalysis = z.infer<typeof aiTechniqueAnalysisSchema>;

const issueSchema = z.enum(TECHNIQUE_ISSUES);

/** Rep of a saved analysis as the API returns it: the measured numbers and issues, plus the AI score. */
export const analyzedRepSchema = z.object({
  repNumber: z.number().int(),
  score: z.number().int().nullable(),
  isEvaluated: z.boolean(),
  issues: z.array(z.object({ issue: issueSchema, severity: z.enum(ISSUE_SEVERITIES) })),
});

/** 201 body of POST /api/technique-analyses. */
export const techniqueAnalysisResultSchema = z.object({
  id: z.uuid(),
  overallScore: z.number().int(),
  mainTip: z.string(),
  strengths: z.array(z.string()),
  corrections: z.array(z.object({ issue: issueSchema, repNumbers: z.array(z.number().int()), text: z.string() })),
  reps: z.array(analyzedRepSchema),
  /** The latest assessment reports an injury or limitation: the screen reinforces the health notice. */
  hasLimitations: z.boolean(),
});
export type TechniqueAnalysisResult = z.infer<typeof techniqueAnalysisResultSchema>;
