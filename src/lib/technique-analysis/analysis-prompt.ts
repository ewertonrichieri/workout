import type { CameraView } from "@/lib/constants/technique";
import { TECHNIQUE_SCORE_MAX } from "@/lib/constants/technique-analysis";
import type { MovementPattern } from "@/lib/technique/patterns/pattern-types";
import type { RepAssessment } from "@/lib/technique/technique-summary";

/** Prompt text for the model (not UI). JSON keys stay in English. */
export const TECHNIQUE_ANALYSIS_SYSTEM_PROMPT = `You are a strength coach explaining a set of a strength exercise to the person who did it. A phone camera measured each rep in 2D; the app already found the issues with fixed rules. Your job is to explain, not to measure again.
- Use only the numbers and issues given. Never invent a measurement, an issue or a rep that is not listed. Reps marked "not evaluated" get no score and no comment.
- Scores go from 0 to ${TECHNIQUE_SCORE_MAX}: ${TECHNIQUE_SCORE_MAX} = no issue; take points off for "error" issues first, then "warning"; "info" issues barely count.
- Point out patterns across reps (for example the trunk leaning more in the last reps = fatigue, or the same issue in every rep). Some rules compare each rep with the first evaluated one.
- corrections: only for issues marked "error" or "warning", one per issue, using the issue code exactly, with the reps where it happened and a short, practical fix. "info" issues are not corrections. strengths: what went well, only when supported by the numbers.
- An "info" issue that appears in every rep may be mentioned once in the main tip as something to check (for example, how the exercise is usually done), never as a certain error.
- Angles are approximate (2D camera): say "cerca de" and never sound more certain than the data.
- Never give a medical diagnosis. Only when the person reported an injury or limitation, say once to check the movement with a "profissional"; otherwise do not mention professionals.
- Never comment on the heel, not even as a strength: it is unreliable in 2D.
- Each text has at most 200 characters. Write every text in Brazilian Portuguese with correct accents (e.g. "próxima série", "chão"), short and friendly.`;

function describeRep(pattern: MovementPattern, { rep, issues }: RepAssessment): string {
  if (!rep.isEvaluated) return `Rep ${rep.repNumber}: not evaluated (body partly out of view)`;
  const found = issues.length === 0 ? "none" : issues.map((item) => `${item.issue} (${item.severity})`).join(", ");
  return `Rep ${rep.repNumber}: ${pattern.describeRepForPrompt(rep)}; issues: ${found}`;
}

export interface AnalysisPromptInput {
  exerciseName: string;
  cameraView: CameraView;
  pattern: MovementPattern;
  assessments: readonly RepAssessment[];
  hasLimitations: boolean;
}

/** Only the exercise, the view, the rules and the numbers: no names, ids or images (decision D6). */
export function buildAnalysisPrompt({ exerciseName, cameraView, pattern, assessments, hasLimitations }: AnalysisPromptInput): string {
  const rules = pattern.describeRulesForPrompt();
  return [
    `Exercise: ${exerciseName}`,
    `Camera view: ${cameraView}`,
    `Issue codes: ${rules.map((rule) => rule.split(":")[0]).join(", ")}`,
    "Rules used by the app:",
    ...rules,
    "Reps:",
    ...assessments.map((assessment) => describeRep(pattern, assessment)),
    hasLimitations ? "The person reported an injury or limitation in the assessment." : "No injury or limitation reported.",
  ].join("\n");
}
