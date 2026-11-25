import type { CameraView } from "@/lib/constants/technique";
import {
  SQUAT_DEPTH_MAX_THIGH_ANGLE,
  SQUAT_HEEL_RISE_MAX_RATIO,
  SQUAT_MIN_DESCENT_MS,
  SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES,
  SQUAT_TRUNK_LEAN_MAX_DEGREES,
  TECHNIQUE_ISSUES,
} from "@/lib/constants/technique-rules";
import { TECHNIQUE_SCORE_MAX } from "@/lib/constants/technique-analysis";
import type { RepAssessment } from "@/lib/technique/technique-summary";

/** Prompt text for the model (not UI). JSON keys stay in English. */
export const TECHNIQUE_ANALYSIS_SYSTEM_PROMPT = `You are a strength coach explaining a squat set to the person who did it. A phone camera measured each rep in 2D; the app already found the issues with fixed rules. Your job is to explain, not to measure again.
- Use only the numbers and issues given. Never invent a measurement, an issue or a rep that is not listed. Reps marked "not evaluated" get no score and no comment.
- Scores go from 0 to ${TECHNIQUE_SCORE_MAX}: ${TECHNIQUE_SCORE_MAX} = no issue; take points off for "error" issues first, then "warning"; "info" issues barely count.
- Point out patterns across reps (for example the trunk leaning more in the last reps = fatigue, or the same issue in every rep).
- corrections: only for issues marked "error" or "warning", one per issue, using the issue code exactly, with the reps where it happened and a short, practical fix. "info" issues are not corrections. strengths: what went well, only when supported by the numbers.
- Angles are approximate (2D camera): say "cerca de" and never sound more certain than the data.
- Never give a medical diagnosis. When the person reported an injury or limitation, say once to check the movement with a professional.
- Write every text in Brazilian Portuguese with correct accents (e.g. "próxima série", "chão"), short and friendly.`;

const MS_PER_SECOND = 1000;

function describeThigh(thighAngle: number): string {
  const degrees = Math.round(Math.abs(thighAngle));
  return thighAngle > 0 ? `thigh ${degrees}° above parallel` : `thigh ${degrees}° below parallel`;
}

function describeRep({ rep, issues }: RepAssessment): string {
  if (!rep.isEvaluated) return `Rep ${rep.repNumber}: not evaluated (body partly out of view)`;
  const measures = [
    `knee ${Math.round(rep.minKneeAngle)}°`,
    describeThigh(rep.minThighAngle),
    `trunk ${Math.round(rep.maxTrunkLean)}°`,
    `descent ${(rep.descentMs / MS_PER_SECOND).toFixed(1)} s`,
    `heel rise ${rep.maxHeelRiseRatio.toFixed(2)}`,
    `knee past toes ${rep.maxKneeTravelRatio.toFixed(2)}`,
  ].join(", ");
  const found = issues.length === 0 ? "none" : issues.map((item) => `${item.issue} (${item.severity})`).join(", ");
  return `Rep ${rep.repNumber}: ${measures}; issues: ${found}`;
}

function describeLimits(): string {
  return [
    `shallow_depth: thigh above parallel by more than ${SQUAT_DEPTH_MAX_THIGH_ANGLE}°`,
    `trunk_lean: trunk more than ${SQUAT_TRUNK_LEAN_MAX_DEGREES}° from vertical`,
    `trunk_lean_fatigue: trunk ${SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES}° or more beyond the first evaluated rep`,
    `heel_lift: heel rise above ${SQUAT_HEEL_RISE_MAX_RATIO} of the shin length (unreliable in 2D)`,
    `fast_descent: descent faster than ${(SQUAT_MIN_DESCENT_MS / MS_PER_SECOND).toFixed(1)} s`,
    "knee_forward: knee ahead of the toes (common, informative)",
  ].join("\n");
}

export interface AnalysisPromptInput {
  exerciseName: string;
  cameraView: CameraView;
  assessments: readonly RepAssessment[];
  hasLimitations: boolean;
}

/** Only the exercise, the view, the rules and the numbers: no names, ids or images (decision D6). */
export function buildAnalysisPrompt({ exerciseName, cameraView, assessments, hasLimitations }: AnalysisPromptInput): string {
  return [
    `Exercise: ${exerciseName}`,
    `Camera view: ${cameraView}`,
    `Issue codes: ${TECHNIQUE_ISSUES.join(", ")}`,
    "Rules used by the app:",
    describeLimits(),
    "Reps:",
    ...assessments.map(describeRep),
    hasLimitations ? "The person reported an injury or limitation in the assessment." : "No injury or limitation reported.",
  ].join("\n");
}
