import { describe, expect, it } from "vitest";
import type { SquatRep } from "./squat/squat-rep-tracker";
import { buildTechniqueSummary } from "./technique-summary";

function rep(repNumber: number, overrides: Partial<SquatRep> = {}): SquatRep {
  return {
    repNumber, startMs: 0, bottomMs: 1500, endMs: 3000, descentMs: 1500, minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30,
    maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 30, seenFrameCount: 30, isEvaluated: true, ...overrides,
  };
}

describe("buildTechniqueSummary", () => {
  it("counts reps and evaluated reps", () => {
    const summary = buildTechniqueSummary([rep(1), rep(2, { isEvaluated: false }), rep(3)], true);
    expect(summary).toMatchObject({ repCount: 3, evaluatedRepCount: 2, needsRerecord: false });
  });

  it("asks to record again when more than half of the reps were not evaluated", () => {
    expect(buildTechniqueSummary([rep(1), rep(2, { isEvaluated: false }), rep(3, { isEvaluated: false })], true).needsRerecord).toBe(true);
    expect(buildTechniqueSummary([rep(1), rep(2, { isEvaluated: false })], true).needsRerecord).toBe(false);
    expect(buildTechniqueSummary([], true)).toMatchObject({ repCount: 0, needsRerecord: true });
  });

  it("compares fatigue against the first evaluated rep", () => {
    const summary = buildTechniqueSummary([rep(1, { isEvaluated: false, maxTrunkLean: 10 }), rep(2, { maxTrunkLean: 30 }), rep(3, { maxTrunkLean: 45 })], true);
    expect(summary.reps.map((item) => item.issues)).toEqual([[], [], [{ issue: "trunk_lean_fatigue", severity: "error" }]]);
    expect(summary.referenceTrunkLean).toBe(30);
  });
});
