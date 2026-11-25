import { describe, expect, it } from "vitest";
import { POSE_LANDMARK, POSE_LANDMARK_COUNT } from "@/lib/technique/pose-landmarks";
import { createRepTracker } from "@/lib/technique/rep-tracker";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { buildTechniqueSummary } from "@/lib/technique/technique-summary";
import { rowPattern } from "./row-pattern";
import { buildRowRep } from "./test-reps";

const FRAME_MS = 100;
const HANGING = -0.3;

describe("rowPattern.measureFrame", () => {
  it("measures the wrist height above the hip in torso lengths (counting signal) and the trunk", () => {
    const landmarks = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
    landmarks[POSE_LANDMARK.leftShoulder] = { x: 0.7, y: 0.3, visibility: 0.9 };
    landmarks[POSE_LANDMARK.leftHip] = { x: 0.5, y: 0.5, visibility: 0.9 };
    landmarks[POSE_LANDMARK.leftElbow] = { x: 0.65, y: 0.45, visibility: 0.9 };
    landmarks[POSE_LANDMARK.leftWrist] = { x: 0.65, y: 0.55, visibility: 0.9 };
    const measures = rowPattern.measureFrame(landmarks, 1);
    expect(measures?.signal).toBeCloseTo(-0.05 / Math.hypot(0.2, 0.2));
    expect(measures?.values.trunkLean).toBeCloseTo(45);
  });
});

/** One fictional pull: wrist from hanging up to `peak`, with the trunk rising `trunkRise` degrees at the top. */
function pullFrames(peak: number, trunkRise: number): Array<[number, number]> {
  const restTrunk = 35;
  const steps = [0.25, 0.5, 0.75, 1];
  const up = steps.map((step) => [HANGING + (peak - HANGING) * step, restTrunk - trunkRise * step] as [number, number]);
  return [[HANGING, restTrunk], [HANGING, restTrunk], ...up, ...up.slice(0, -1).reverse(), [HANGING, restTrunk]];
}

/** The groups of the calibration video (fictional numbers of the same shape): normal, short, pulled to the shoulders. */
function trackSet(): TechniqueRep[] {
  const pulls = [pullFrames(0.4, 2), pullFrames(0.3, 3), pullFrames(0.2, 2), pullFrames(-0.04, 1), pullFrames(0.02, 1), pullFrames(0.04, 0), pullFrames(1.0, 10), pullFrames(1.05, 12), pullFrames(0.98, 13)];
  const tracker = createRepTracker(rowPattern);
  pulls.flat().forEach(([wristHeight, trunkLean], index) =>
    tracker.addFrame({ timestampMs: index * FRAME_MS, measures: { signal: wristHeight, values: { wristHeight, trunkLean, elbowAngle: 120 } } }));
  return tracker.finish();
}

describe("row rules (D14)", () => {
  it("counts every pull, including the short ones, and flags each group of the calibration video", () => {
    const reps = trackSet();
    expect(reps).toHaveLength(9);
    const summary = buildTechniqueSummary(rowPattern, reps, true);
    const warnings = summary.reps.map(({ issues }) => issues.filter((item) => item.severity === "warning").map((item) => item.issue));
    expect(warnings).toEqual([[], [], [], ["row_short_pull"], ["row_short_pull"], ["row_short_pull"], ["row_trunk_rise"], ["row_trunk_rise"], ["row_trunk_rise"]]);
    expect(reps[6]?.metrics.trunkRise).toBeCloseTo(10);
  });

  it("only informs when the trunk is more upright than usual (literature reference)", () => {
    const summary = buildTechniqueSummary(rowPattern, [buildRowRep(1, { restTrunkLean: 35 })], true);
    expect(summary.reps[0]?.issues).toEqual([{ issue: "row_trunk_upright", severity: "info" }]);
  });

  it("does not count a small arm movement that never reaches the hip line", () => {
    const tracker = createRepTracker(rowPattern);
    [HANGING, HANGING, -0.14, -0.12, -0.14, HANGING].forEach((wristHeight, index) =>
      tracker.addFrame({ timestampMs: index * FRAME_MS, measures: { signal: wristHeight, values: { wristHeight, trunkLean: 35, elbowAngle: 150 } } }));
    expect(tracker.repCount).toBe(0);
  });
});
