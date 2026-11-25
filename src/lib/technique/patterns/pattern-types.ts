import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import type { TechniqueIssue } from "@/lib/constants/technique-rules";
import type { PoseLandmark } from "@/lib/technique/body-framing";
import type { FrameMeasures, TechniqueRep } from "@/lib/technique/rep-types";

/**
 * Counting with hysteresis on the signal (D13). "decreasing": the signal falls when moving (joint angles closing);
 * "increasing": it rises (wrist going up in a row).
 */
export interface CounterRule {
  direction: "decreasing" | "increasing";
  /** At or beyond this value (towards rest) the user is at rest. */
  restAt: number;
  /** Past this value (away from rest) a rep starts. */
  startAt: number;
  /** The rep counts only when the signal got at least this far from rest. */
  targetAt: number;
}

/** One per-rep metric: read from each frame (and the rest frame before the rep), keeping the min or the max. */
export interface MetricSpec {
  name: string;
  keep: "min" | "max";
  read: (values: Readonly<Record<string, number>>, restValues: Readonly<Record<string, number>>) => number;
  /** Valid range the server accepts. */
  bounds: readonly [number, number];
}

export interface MovementPattern {
  id: TechniqueRuleSetId;
  measureFrame: (landmarks: readonly PoseLandmark[], aspectRatio: number) => FrameMeasures | null;
  counter: CounterRule;
  metrics: readonly MetricSpec[];
  /** Issues of one evaluated rep; `reference` is the first evaluated rep (undefined for the reference itself). */
  detectIssues: (rep: TechniqueRep, reference: TechniqueRep | undefined) => TechniqueIssue[];
  /** Issues worth a spoken cue, most important first (D7); informative issues are never spoken. */
  spokenCues: readonly TechniqueIssue[];
  /** Degrees quoted in an issue text (e.g. "inclinou cerca de 15° a mais"). */
  issueDegrees: (issue: TechniqueIssue, rep: TechniqueRep, reference: TechniqueRep | undefined) => number;
  /** English text for the AI prompt (never shown to the user). */
  describeRulesForPrompt: () => string[];
  describeRepForPrompt: (rep: TechniqueRep) => string;
}

/** Frame value read by a metric; a missing value means the pattern changed (programming error). */
export function readValue(values: Readonly<Record<string, number>>, name: string): number {
  const value = values[name];
  if (value === undefined) throw new Error(`Missing technique frame value: ${name}`);
  return value;
}

/** Metric value of a rep; a missing metric means the pattern changed (programming error). */
export function readMetric(rep: TechniqueRep, name: string): number {
  const value = rep.metrics[name];
  if (value === undefined) throw new Error(`Missing technique metric: ${name}`);
  return value;
}

/** Reference rep for relative rules, never the rep itself. */
export function otherReference(rep: TechniqueRep, reference: TechniqueRep | undefined): TechniqueRep | undefined {
  return reference && reference.repNumber !== rep.repNumber ? reference : undefined;
}

export function selectIssues(checks: ReadonlyArray<readonly [TechniqueIssue, boolean]>): TechniqueIssue[] {
  return checks.filter(([, isPresent]) => isPresent).map(([issue]) => issue);
}
