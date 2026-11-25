import { describe, expect, it } from "vitest";
import { pickLiveCue } from "./live-cues";
import { hingePattern } from "./patterns/hinge-pattern";
import { rowPattern } from "./patterns/row-pattern";
import { squatPattern } from "./patterns/squat-pattern";
import { buildHingeRep, buildRep, buildRowRep } from "./patterns/test-reps";

describe("pickLiveCue (spec 014, D7: one short cue per rep)", () => {
  it("says nothing about a good rep or before any rep", () => {
    expect(pickLiveCue(squatPattern, [buildRep(1)], true)).toBeNull();
    expect(pickLiveCue(squatPattern, [], true)).toBeNull();
  });

  it("picks the most important issue of the last rep", () => {
    expect(pickLiveCue(squatPattern, [buildRep(1, { descentMs: 400 }, { minThighAngle: 20 })], true)).toBe("shallow_depth");
    expect(pickLiveCue(squatPattern, [buildRep(1), buildRep(2, { descentMs: 400 }, { maxTrunkLean: 50 })], true)).toBe("trunk_lean_fatigue");
    expect(pickLiveCue(squatPattern, [buildRep(1, { descentMs: 400 })], true)).toBe("fast_descent");
  });

  it("never speaks issues that only inform (heel, knee, absolute trunk, literature references)", () => {
    expect(pickLiveCue(squatPattern, [buildRep(1, {}, { maxHeelRiseRatio: 0.4, maxKneeTravelRatio: 0.3, maxTrunkLean: 70 })], true)).toBeNull();
    expect(pickLiveCue(hingePattern, [buildHingeRep(1, { minKneeAngle: 90 })], true)).toBeNull();
    expect(pickLiveCue(rowPattern, [buildRowRep(1, { restTrunkLean: 30 })], true)).toBeNull();
  });

  it("speaks the hip hinge and row cues of each pattern", () => {
    expect(pickLiveCue(hingePattern, [buildHingeRep(1), buildHingeRep(2, { minHipAngle: 110 })], true)).toBe("hinge_short_range");
    expect(pickLiveCue(rowPattern, [buildRowRep(1, { maxWristHeight: 0, trunkRise: 12 })], true)).toBe("row_short_pull");
    expect(pickLiveCue(rowPattern, [buildRowRep(1, { trunkRise: 12 })], true)).toBe("row_trunk_rise");
  });

  it("stays quiet on reps that were not evaluated and before the calibration", () => {
    expect(pickLiveCue(squatPattern, [buildRep(1, { isEvaluated: false }, { minThighAngle: 30 })], true)).toBeNull();
    expect(pickLiveCue(squatPattern, [buildRep(1, {}, { minThighAngle: 30 })], false)).toBeNull();
  });
});
