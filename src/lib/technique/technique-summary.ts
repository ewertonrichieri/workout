import type { SquatRep } from "./squat/squat-rep-tracker";
import { classifySquatRep, type RepIssue } from "./squat/squat-rules";

export interface RepAssessment {
  rep: SquatRep;
  issues: RepIssue[];
}

export interface TechniqueSummary {
  repCount: number;
  evaluatedRepCount: number;
  /** No reps, or more than half not evaluated: record again following the guide (spec 014). */
  needsRerecord: boolean;
  /** Trunk lean of the first evaluated rep, the fatigue reference; null without one. */
  referenceTrunkLean: number | null;
  reps: RepAssessment[];
}

/** Local summary shown right after the set, before the AI (step 5.4). */
export function buildTechniqueSummary(reps: readonly SquatRep[], isCalibrated: boolean): TechniqueSummary {
  const reference = reps.find((rep) => rep.isEvaluated);
  const evaluatedRepCount = reps.filter((rep) => rep.isEvaluated).length;
  const unevaluatedRepCount = reps.length - evaluatedRepCount;
  return {
    repCount: reps.length,
    evaluatedRepCount,
    needsRerecord: reps.length === 0 || unevaluatedRepCount > reps.length / 2,
    referenceTrunkLean: reference?.maxTrunkLean ?? null,
    reps: reps.map((rep) => ({ rep, issues: classifySquatRep(rep, reference, isCalibrated) })),
  };
}
