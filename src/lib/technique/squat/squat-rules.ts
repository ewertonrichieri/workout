import {
  SQUAT_DEPTH_MAX_THIGH_ANGLE,
  SQUAT_HEEL_RISE_MAX_RATIO,
  SQUAT_ISSUE_SEVERITY,
  SQUAT_KNEE_TRAVEL_INFO_RATIO,
  SQUAT_MIN_DESCENT_MS,
  SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES,
  SQUAT_TRUNK_LEAN_MAX_DEGREES,
  type IssueSeverity,
  type TechniqueIssue,
} from "@/lib/constants/technique-rules";
import type { SquatRep } from "./squat-rep-tracker";

export interface RepIssue {
  issue: TechniqueIssue;
  severity: IssueSeverity;
}

function hasFatigue(rep: SquatRep, reference: SquatRep | undefined): boolean {
  if (!reference || reference.repNumber === rep.repNumber) return false;
  return rep.maxTrunkLean - reference.maxTrunkLean >= SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES;
}

/** Issues in the fixed order the summary shows them. */
function detectIssues(rep: SquatRep, reference: SquatRep | undefined): TechniqueIssue[] {
  const checks: ReadonlyArray<[TechniqueIssue, boolean]> = [
    ["shallow_depth", rep.minThighAngle > SQUAT_DEPTH_MAX_THIGH_ANGLE],
    ["heel_lift", rep.maxHeelRiseRatio > SQUAT_HEEL_RISE_MAX_RATIO],
    ["fast_descent", rep.descentMs < SQUAT_MIN_DESCENT_MS],
    ["trunk_lean", rep.maxTrunkLean > SQUAT_TRUNK_LEAN_MAX_DEGREES],
    ["trunk_lean_fatigue", hasFatigue(rep, reference)],
    ["knee_forward", rep.maxKneeTravelRatio > SQUAT_KNEE_TRAVEL_INFO_RATIO],
  ];
  return checks.filter(([, isPresent]) => isPresent).map(([issue]) => issue);
}

/**
 * D5 rules for one rep. `reference` is the first evaluated rep (fatigue comparison).
 * Before the calibration (POS-001) every issue only informs.
 */
export function classifySquatRep(rep: SquatRep, reference: SquatRep | undefined, isCalibrated: boolean): RepIssue[] {
  if (!rep.isEvaluated) return [];
  return detectIssues(rep, reference).map((issue) => ({ issue, severity: isCalibrated ? SQUAT_ISSUE_SEVERITY[issue] : "info" }));
}
