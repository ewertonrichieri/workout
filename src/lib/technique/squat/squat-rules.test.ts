import { describe, expect, it } from "vitest";
import { classifySquatRep } from "./squat-rules";
import type { SquatRep } from "./squat-rep-tracker";

const GOOD_REP: SquatRep = {
  repNumber: 1,
  startMs: 0,
  bottomMs: 1500,
  endMs: 3000,
  descentMs: 1500,
  minKneeAngle: 80,
  minThighAngle: -5,
  maxTrunkLean: 30,
  maxKneeTravelRatio: -0.1,
  maxHeelRiseRatio: 0.01,
  frameCount: 30,
  seenFrameCount: 30,
  isEvaluated: true,
};

function issuesOf(rep: Partial<SquatRep>, reference?: Partial<SquatRep>, isCalibrated = true) {
  return classifySquatRep({ ...GOOD_REP, ...rep }, reference && { ...GOOD_REP, ...reference }, isCalibrated);
}

describe("classifySquatRep (decision D5, calibrated with the user's videos, POS-001)", () => {
  it("finds nothing in a good rep", () => {
    expect(issuesOf({})).toEqual([]);
  });

  it("flags a rep whose thigh did not reach parallel", () => {
    expect(issuesOf({ minThighAngle: 0 })).toEqual([]);
    expect(issuesOf({ minThighAngle: 15 })).toEqual([{ issue: "shallow_depth", severity: "error" }]);
  });

  it("only informs about the heel: 2D heel readings overlap too much to call it an error", () => {
    expect(issuesOf({ maxHeelRiseRatio: 0.24 })).toEqual([]);
    expect(issuesOf({ maxHeelRiseRatio: 0.26 })).toEqual([{ issue: "heel_lift", severity: "info" }]);
  });

  it("warns about a descent faster than the minimum", () => {
    expect(issuesOf({ descentMs: 699 })).toEqual([{ issue: "fast_descent", severity: "warning" }]);
    expect(issuesOf({ descentMs: 700 })).toEqual([]);
  });

  it("only informs about the absolute trunk lean and the knee passing the toes", () => {
    expect(issuesOf({ maxTrunkLean: 60 })).toEqual([]);
    expect(issuesOf({ maxTrunkLean: 61 })).toEqual([{ issue: "trunk_lean", severity: "info" }]);
    expect(issuesOf({ maxKneeTravelRatio: 0.05 })).toEqual([{ issue: "knee_forward", severity: "info" }]);
  });

  it("flags the trunk leaning more than in the first rep (fatigue)", () => {
    expect(issuesOf({ repNumber: 6, maxTrunkLean: 44 }, { maxTrunkLean: 30 })).toEqual([]);
    expect(issuesOf({ repNumber: 6, maxTrunkLean: 45 }, { maxTrunkLean: 30 })).toEqual([{ issue: "trunk_lean_fatigue", severity: "error" }]);
  });

  it("does not compare the reference rep with itself", () => {
    expect(issuesOf({ maxTrunkLean: 40 }, { maxTrunkLean: 20 })).toEqual([]);
  });

  it("does not judge a rep that was not evaluated", () => {
    expect(issuesOf({ isEvaluated: false, minThighAngle: 30 })).toEqual([]);
  });
});

describe("classifySquatRep before calibration (D5 provisional)", () => {
  it("only informs: every issue is info", () => {
    expect(issuesOf({ minThighAngle: 15, maxHeelRiseRatio: 0.3, descentMs: 500 }, undefined, false)).toEqual([
      { issue: "shallow_depth", severity: "info" },
      { issue: "heel_lift", severity: "info" },
      { issue: "fast_descent", severity: "info" },
    ]);
  });
});
