import { describe, expect, it } from "vitest";
import type { SquatRep } from "./squat/squat-rep-tracker";
import { pickLiveCue } from "./live-cues";

function rep(repNumber: number, overrides: Partial<SquatRep> = {}): SquatRep {
  return {
    repNumber, startMs: 0, bottomMs: 1500, endMs: 3000, descentMs: 1500, minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30,
    maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 30, seenFrameCount: 30, isEvaluated: true, ...overrides,
  };
}

describe("pickLiveCue (spec 014, D7: one short cue per rep)", () => {
  it("says nothing about a good rep or before any rep", () => {
    expect(pickLiveCue([rep(1)], true)).toBeNull();
    expect(pickLiveCue([], true)).toBeNull();
  });

  it("picks the most important issue of the last rep", () => {
    expect(pickLiveCue([rep(1, { minThighAngle: 20, descentMs: 400 })], true)).toBe("shallow_depth");
    expect(pickLiveCue([rep(1), rep(2, { maxTrunkLean: 50, descentMs: 400 })], true)).toBe("trunk_lean_fatigue");
    expect(pickLiveCue([rep(1, { descentMs: 400 })], true)).toBe("fast_descent");
  });

  it("never speaks issues that only inform (heel, knee, absolute trunk)", () => {
    expect(pickLiveCue([rep(1, { maxHeelRiseRatio: 0.4, maxKneeTravelRatio: 0.3, maxTrunkLean: 70 })], true)).toBeNull();
  });

  it("stays quiet on reps that were not evaluated and before the calibration", () => {
    expect(pickLiveCue([rep(1, { isEvaluated: false, minThighAngle: 30 })], true)).toBeNull();
    expect(pickLiveCue([rep(1, { minThighAngle: 30 })], false)).toBeNull();
  });
});
