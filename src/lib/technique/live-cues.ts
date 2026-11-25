import type { TechniqueIssue } from "@/lib/constants/technique-rules";
import type { TechniqueRep } from "./pose-rep-tracker";
import { classifySquatRep } from "./squat/squat-rules";

/** Issues worth a spoken cue, most important first (D7). Informative issues are never spoken: false alarms are worse. */
export const SPOKEN_CUE_PRIORITY = ["shallow_depth", "trunk_lean_fatigue", "fast_descent"] as const satisfies readonly TechniqueIssue[];
export type SpokenCue = (typeof SPOKEN_CUE_PRIORITY)[number];

/** The one cue for the rep that just ended, or null. Silent before the calibration (POS-001). */
export function pickLiveCue(reps: readonly TechniqueRep[], isCalibrated: boolean): SpokenCue | null {
  const lastRep = reps.at(-1);
  if (!lastRep || !isCalibrated) return null;
  const reference = reps.find((rep) => rep.isEvaluated);
  const issues = classifySquatRep(lastRep, reference, isCalibrated).filter((item) => item.severity !== "info");
  return SPOKEN_CUE_PRIORITY.find((issue) => issues.some((item) => item.issue === issue)) ?? null;
}
