import { describe, expect, it } from "vitest";
import { POSE_LANDMARK, POSE_LANDMARK_COUNT } from "@/lib/technique/pose-landmarks";
import { createRepTracker } from "@/lib/technique/rep-tracker";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { buildTechniqueSummary } from "@/lib/technique/technique-summary";
import { hingePattern } from "./hinge-pattern";
import { buildHingeRep } from "./test-reps";

const FRAME_MS = 100;

describe("hingePattern.measureFrame", () => {
  it("measures the hip angle (counting signal), the knee and the trunk from the side", () => {
    const landmarks = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
    landmarks[POSE_LANDMARK.rightShoulder] = { x: 0.7, y: 0.45, visibility: 0.9 };
    landmarks[POSE_LANDMARK.rightHip] = { x: 0.5, y: 0.45, visibility: 0.9 };
    landmarks[POSE_LANDMARK.rightKnee] = { x: 0.5, y: 0.7, visibility: 0.9 };
    landmarks[POSE_LANDMARK.rightAnkle] = { x: 0.5, y: 0.9, visibility: 0.9 };
    const measures = hingePattern.measureFrame(landmarks, 1);
    expect(measures?.signal).toBeCloseTo(90);
    expect(measures?.values).toMatchObject({ hipAngle: expect.closeTo(90), kneeAngle: expect.closeTo(180), trunkLean: expect.closeTo(90) });
  });
});

/** One fictional hinge rep: hip angle closing from 175° to `hip` and back, with the knee bending to `knee`. */
function repFrames(hip: number, knee: number, descentFrames: number): Array<[number, number]> {
  const down = Array.from({ length: descentFrames }, (_, index) => {
    const progress = (index + 1) / descentFrames;
    return [175 - (175 - hip) * progress, 175 - (175 - knee) * progress] as [number, number];
  });
  return [[175, 175], ...down, ...down.slice(0, -1).reverse(), [175, 175], [175, 175]];
}

/** The groups of the calibration video (fictional numbers of the same shape): good, short, knees bending, fast. */
function trackSet(): TechniqueRep[] {
  const reps = [
    repFrames(75, 150, 13), repFrames(78, 152, 12), repFrames(76, 149, 14),
    repFrames(115, 160, 9), repFrames(118, 158, 9), repFrames(110, 160, 10),
    repFrames(50, 120, 17), repFrames(55, 128, 16), repFrames(48, 118, 17),
    repFrames(82, 150, 4), repFrames(85, 148, 4), repFrames(80, 151, 5),
  ];
  const tracker = createRepTracker(hingePattern);
  reps.flat().forEach(([hipAngle, kneeAngle], index) =>
    tracker.addFrame({ timestampMs: index * FRAME_MS, measures: { signal: hipAngle, values: { hipAngle, kneeAngle, trunkLean: 180 - hipAngle - 20 } } }));
  return tracker.finish();
}

describe("hinge rules (D14, relative to the first rep)", () => {
  it("counts every rep and flags each group of the calibration video, and only it", () => {
    const reps = trackSet();
    expect(reps).toHaveLength(12);
    const summary = buildTechniqueSummary(hingePattern, reps, true);
    const warnings = summary.reps.map(({ issues }) => issues.filter((item) => item.severity === "warning").map((item) => item.issue));
    expect(warnings).toEqual([
      [], [], [],
      ["hinge_short_range"], ["hinge_short_range"], ["hinge_short_range"],
      ["hinge_knee_bend"], ["hinge_knee_bend"], ["hinge_knee_bend"],
      ["fast_descent"], ["fast_descent"], ["fast_descent"],
    ]);
  });

  it("only informs when the knee bends like a squat (literature reference)", () => {
    const summary = buildTechniqueSummary(hingePattern, [buildHingeRep(1, { minKneeAngle: 92 })], true);
    expect(summary.reps[0]?.issues).toEqual([{ issue: "hinge_squat_like", severity: "info" }]);
  });

  it("never compares the first rep with itself and quotes the degrees of the difference", () => {
    const first = buildHingeRep(1, { minHipAngle: 75 });
    const short = buildHingeRep(2, { minHipAngle: 110 });
    expect(hingePattern.detectIssues(first, first)).toEqual([]);
    expect(hingePattern.issueDegrees("hinge_short_range", short, first)).toBe(35);
  });
});
