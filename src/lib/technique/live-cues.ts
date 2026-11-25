import type { TechniqueIssue } from "@/lib/constants/technique-rules";
import type { MovementPattern } from "./patterns/pattern-types";
import type { TechniqueRep } from "./rep-types";
import { classifyRep } from "./rep-rules";

/** The one spoken cue for the rep that just ended, or null (D7). Silent before the calibration. */
export function pickLiveCue(pattern: MovementPattern, reps: readonly TechniqueRep[], isCalibrated: boolean): TechniqueIssue | null {
  const lastRep = reps.at(-1);
  if (!lastRep || !isCalibrated) return null;
  const reference = reps.find((rep) => rep.isEvaluated);
  const issues = classifyRep(pattern, lastRep, reference, isCalibrated).filter((item) => item.severity !== "info");
  return pattern.spokenCues.find((issue) => issues.some((item) => item.issue === issue)) ?? null;
}
