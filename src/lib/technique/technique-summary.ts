import type { MovementPattern } from "./patterns/pattern-types";
import type { TechniqueRep } from "./rep-types";
import { classifyRep, type RepIssue } from "./rep-rules";

export interface RepAssessment {
  rep: TechniqueRep;
  issues: RepIssue[];
}

export interface TechniqueSummary {
  repCount: number;
  evaluatedRepCount: number;
  /** No reps, or more than half not evaluated: record again following the guide (spec 014). */
  needsRerecord: boolean;
  /** First evaluated rep: the reference of the relative rules (D13); undefined without one. */
  reference: TechniqueRep | undefined;
  reps: RepAssessment[];
}

/** Local summary right after the set (and the server classification): every rep with its issues. */
export function buildTechniqueSummary(pattern: MovementPattern, reps: readonly TechniqueRep[], isCalibrated: boolean): TechniqueSummary {
  const reference = reps.find((rep) => rep.isEvaluated);
  const evaluatedRepCount = reps.filter((rep) => rep.isEvaluated).length;
  const unevaluatedRepCount = reps.length - evaluatedRepCount;
  return {
    repCount: reps.length,
    evaluatedRepCount,
    needsRerecord: reps.length === 0 || unevaluatedRepCount > reps.length / 2,
    reference,
    reps: reps.map((rep) => ({ rep, issues: classifyRep(pattern, rep, reference, isCalibrated) })),
  };
}
