import { ISSUE_SEVERITY, type IssueSeverity, type TechniqueIssue } from "@/lib/constants/technique-rules";
import type { MovementPattern } from "./patterns/pattern-types";
import type { TechniqueRep } from "./rep-types";

export interface RepIssue {
  issue: TechniqueIssue;
  severity: IssueSeverity;
}

/** Issues of one rep with their severity; before the calibration every issue only informs. Unevaluated reps: none. */
export function classifyRep(pattern: MovementPattern, rep: TechniqueRep, reference: TechniqueRep | undefined, isCalibrated: boolean): RepIssue[] {
  if (!rep.isEvaluated) return [];
  return pattern.detectIssues(rep, reference).map((issue) => ({ issue, severity: isCalibrated ? ISSUE_SEVERITY[issue] : "info" }));
}
