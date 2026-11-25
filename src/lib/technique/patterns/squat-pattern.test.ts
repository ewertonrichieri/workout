import { describe, expect, it } from "vitest";
import { classifyRep } from "@/lib/technique/rep-rules";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { squatPattern } from "./squat-pattern";
import { buildRep } from "./test-reps";
import { buildSidePose, PARALLEL_BOTTOM, STANDING } from "./test-poses";

const SQUARE = 1;

describe("squatPattern.measureFrame", () => {
  it("measures a standing frame", () => {
    const measures = squatPattern.measureFrame(buildSidePose(STANDING), SQUARE)?.values;
    expect(measures?.kneeAngle).toBeCloseTo(180);
    expect(measures?.thighAngle).toBeCloseTo(90);
    expect(measures?.trunkLean).toBeCloseTo(0);
    expect(measures?.heelToToeRatio).toBeCloseTo(0);
    expect(measures?.kneeTravelRatio).toBeCloseTo(-0.3);
    expect(squatPattern.measureFrame(buildSidePose(STANDING), SQUARE)?.signal).toBeCloseTo(180);
  });

  it("measures the bottom of a parallel squat", () => {
    const measures = squatPattern.measureFrame(buildSidePose(PARALLEL_BOTTOM), SQUARE)?.values;
    expect(measures?.kneeAngle).toBeCloseTo(63.43, 1);
    expect(measures?.thighAngle).toBeCloseTo(0);
    expect(measures?.trunkLean).toBeCloseTo(30.96, 1);
  });

  it("uses whichever side the camera sees", () => {
    const left = squatPattern.measureFrame(buildSidePose(PARALLEL_BOTTOM, "left"), SQUARE)?.values;
    expect(left?.kneeAngle).toBeCloseTo(63.43, 1);
  });

  it("measures the heel rising towards the toe level relative to the shin", () => {
    const raised = { ...STANDING, heel: { x: 0.47, y: 0.88 } };
    expect(squatPattern.measureFrame(buildSidePose(raised), SQUARE)?.values?.heelToToeRatio).toBeCloseTo(0.2);
  });

  it("returns null when a joint used by the rules is not seen (never guesses)", () => {
    expect(squatPattern.measureFrame(buildSidePose(STANDING, "right", 0.3), SQUARE)).toBeNull();
    expect(squatPattern.measureFrame([], SQUARE)).toBeNull();
  });

  it("corrects the image aspect ratio before measuring angles", () => {
    const wide = { ...PARALLEL_BOTTOM, hip: { x: 0.45, y: 0.7 }, knee: { x: 0.55, y: 0.7 } };
    // On a 2:1 image a 0.1 horizontal step is as long as a 0.2 vertical step.
    expect(squatPattern.measureFrame(buildSidePose(wide), 2)?.values?.thighAngle).toBeCloseTo(0);
    const tilted = { ...STANDING, shoulder: { x: 0.6, y: 0.3 } };
    expect(squatPattern.measureFrame(buildSidePose(tilted), 2)?.values?.trunkLean).toBeCloseTo(45);
  });
});


type RepChange = Partial<Omit<TechniqueRep, "metrics">> & Record<string, unknown>;
const METRIC_NAMES = ["minKneeAngle", "minThighAngle", "maxTrunkLean", "maxKneeTravelRatio", "maxHeelRiseRatio"];

function toRep(change: RepChange): TechniqueRep {
  const metrics = Object.fromEntries(Object.entries(change).filter(([key]) => METRIC_NAMES.includes(key))) as Record<string, number>;
  const fields = Object.fromEntries(Object.entries(change).filter(([key]) => !METRIC_NAMES.includes(key)));
  return buildRep((fields.repNumber as number | undefined) ?? 1, fields, metrics);
}

function issuesOf(rep: RepChange, reference?: RepChange, isCalibrated = true) {
  return classifyRep(squatPattern, toRep(rep), reference && toRep(reference), isCalibrated);
}

describe("squat rules (decision D5, calibrated with the user's videos, POS-001)", () => {
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

describe("squat rules before calibration", () => {
  it("only informs: every issue is info", () => {
    expect(issuesOf({ minThighAngle: 15, maxHeelRiseRatio: 0.3, descentMs: 500 }, undefined, false)).toEqual([
      { issue: "shallow_depth", severity: "info" },
      { issue: "heel_lift", severity: "info" },
      { issue: "fast_descent", severity: "info" },
    ]);
  });
});
