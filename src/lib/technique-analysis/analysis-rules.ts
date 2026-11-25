import {
  MAX_CORRECTIONS,
  MAX_FEEDBACK_TEXT_LENGTH,
  MAX_STRENGTHS,
  TECHNIQUE_SCORE_MAX,
} from "@/lib/constants/technique-analysis";
import { TECHNIQUE_ISSUES, type TechniqueIssue } from "@/lib/constants/technique-rules";
import type { RepAssessment } from "@/lib/technique/technique-summary";
import type { AiTechniqueAnalysis } from "./analysis-schema";

/** Metadata for the logs: never the AI text. */
export type AnalysisIssue = "unknown_issue" | "unknown_rep_number" | "unflagged_issue";

type Correction = { issue: TechniqueIssue; repNumbers: number[]; text: string };

export interface SanitizedAnalysis {
  analysis: Omit<AiTechniqueAnalysis, "corrections"> & { corrections: Correction[] };
  issues: AnalysisIssue[];
}

function clampScore(score: number): number {
  return Math.min(TECHNIQUE_SCORE_MAX, Math.max(0, Math.round(score)));
}

function cleanText(text: string): string {
  return text.trim().slice(0, MAX_FEEDBACK_TEXT_LENGTH);
}

function isKnownIssue(issue: string): issue is TechniqueIssue {
  return (TECHNIQUE_ISSUES as readonly string[]).includes(issue);
}

/** Reps where the server rules flagged each issue as an error or warning ("info" never becomes a correction). */
function flaggedRepsByIssue(assessments: readonly RepAssessment[]): Map<TechniqueIssue, number[]> {
  const flagged = new Map<TechniqueIssue, number[]>();
  assessments.forEach(({ rep, issues }) => issues.filter((item) => item.severity !== "info").forEach((item) => {
    flagged.set(item.issue, [...(flagged.get(item.issue) ?? []), rep.repNumber]);
  }));
  return flagged;
}

function sanitizeCorrection(correction: AiTechniqueAnalysis["corrections"][number], flagged: Map<TechniqueIssue, number[]>, issues: Set<AnalysisIssue>): Correction[] {
  if (!isKnownIssue(correction.issue)) {
    issues.add("unknown_issue");
    return [];
  }
  const flaggedReps = flagged.get(correction.issue) ?? [];
  const cited = correction.repNumbers.filter((repNumber) => flaggedReps.includes(repNumber));
  const repNumbers = correction.repNumbers.length === 0 ? flaggedReps : cited;
  const text = cleanText(correction.text);
  if (repNumbers.length === 0) issues.add("unflagged_issue");
  return repNumbers.length === 0 || text === "" ? [] : [{ issue: correction.issue, repNumbers, text }];
}

/**
 * Keeps only what was measured (spec 014): scores of evaluated reps (0–10), corrections only for errors and warnings
 * the server rules flagged in the cited reps, and short texts.
 */
export function sanitizeAnalysis(output: AiTechniqueAnalysis, assessments: readonly RepAssessment[]): SanitizedAnalysis {
  const issues = new Set<AnalysisIssue>();
  const evaluated = assessments.filter(({ rep }) => rep.isEvaluated).map(({ rep }) => rep.repNumber);
  const reps = output.reps.filter((rep) => evaluated.includes(rep.repNumber)).map((rep) => ({ repNumber: rep.repNumber, score: clampScore(rep.score) }));
  if (reps.length < output.reps.length) issues.add("unknown_rep_number");
  const flagged = flaggedRepsByIssue(assessments);
  const corrections = output.corrections.flatMap((correction) => sanitizeCorrection(correction, flagged, issues)).slice(0, MAX_CORRECTIONS);
  const analysis = {
    overallScore: clampScore(output.overallScore),
    reps,
    strengths: output.strengths.map(cleanText).filter((text) => text !== "").slice(0, MAX_STRENGTHS),
    corrections,
    mainTip: cleanText(output.mainTip),
  };
  return { analysis, issues: [...issues] };
}
