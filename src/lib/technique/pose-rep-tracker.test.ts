import { describe, expect, it } from "vitest";
import { createPoseRepTracker } from "./pose-rep-tracker";
import { buildSidePose, PARALLEL_BOTTOM, STANDING } from "./squat/squat-test-poses";

const FRAME_MS = 100;

describe("createPoseRepTracker", () => {
  it("measures each pose with the exercise rules and counts the reps", () => {
    const tracker = createPoseRepTracker("squat");
    const poses = [STANDING, STANDING, PARALLEL_BOTTOM, PARALLEL_BOTTOM, STANDING];
    poses.forEach((joints, index) => tracker.addPose(buildSidePose(joints), 1, index * FRAME_MS));
    expect(tracker.repCount).toBe(1);
    expect(tracker.finish()[0]).toMatchObject({ repNumber: 1, isEvaluated: true });
  });

  it("does not move on poses the camera did not see", () => {
    const tracker = createPoseRepTracker("squat");
    tracker.addPose([], 1, 0);
    expect(tracker.repCount).toBe(0);
  });
});
