import { describe, expect, it } from "vitest";
import { POSE_LANDMARK_COUNT } from "@/lib/technique/pose-landmarks";
import { assessFraming, type PoseLandmark } from "./body-framing";

const VISIBLE = 0.9;
const HIDDEN = 0.1;

/** Fictional side-view standing pose: head at the top, feet at the bottom, centered. */
function buildStandingPose(overrides: Record<number, Partial<PoseLandmark>> = {}): PoseLandmark[] {
  return Array.from({ length: POSE_LANDMARK_COUNT }, (_, index) => {
    const y = 0.1 + (index / POSE_LANDMARK_COUNT) * 0.8;
    return { x: 0.5, y, visibility: VISIBLE, ...overrides[index] };
  });
}

describe("assessFraming", () => {
  it("is ready when every required body part is visible inside the frame", () => {
    expect(assessFraming(buildStandingPose())).toEqual({ isReady: true });
  });

  it("reports no person when there are no landmarks", () => {
    expect(assessFraming([])).toEqual({ isReady: false, issue: "no_person" });
  });

  it("accepts one visible side of the body (side view hides the other)", () => {
    const hiddenLeft = Object.fromEntries([11, 23, 25, 27, 29, 31, 7].map((index) => [index, { visibility: HIDDEN }]));
    expect(assessFraming(buildStandingPose(hiddenLeft))).toEqual({ isReady: true });
  });

  it("reports hidden feet when both ankles and feet are not visible", () => {
    const hiddenFeet = Object.fromEntries([27, 28, 29, 30, 31, 32].map((index) => [index, { visibility: HIDDEN }]));
    expect(assessFraming(buildStandingPose(hiddenFeet))).toEqual({ isReady: false, issue: "feet_hidden" });
  });

  it("reports hidden feet when they are below the frame margin", () => {
    const lowFeet = Object.fromEntries([27, 28, 29, 30, 31, 32].map((index) => [index, { y: 0.995 }]));
    expect(assessFraming(buildStandingPose(lowFeet))).toEqual({ isReady: false, issue: "feet_hidden" });
  });

  it("reports hidden head when nose and ears are out", () => {
    const hiddenHead = Object.fromEntries([0, 7, 8].map((index) => [index, { visibility: HIDDEN }]));
    expect(assessFraming(buildStandingPose(hiddenHead))).toEqual({ isReady: false, issue: "head_hidden" });
  });

  it("asks to step back when both head and feet are out", () => {
    const cut = Object.fromEntries([0, 7, 8, 27, 28, 29, 30, 31, 32].map((index) => [index, { visibility: HIDDEN }]));
    expect(assessFraming(buildStandingPose(cut))).toEqual({ isReady: false, issue: "too_close" });
  });

  it("asks to center the body when the torso leaves the side of the frame", () => {
    const offside = Object.fromEntries([11, 12, 23, 24].map((index) => [index, { x: 1.02 }]));
    expect(assessFraming(buildStandingPose(offside))).toEqual({ isReady: false, issue: "off_center" });
  });

  describe("side view check (squat filmed from the side)", () => {
    const frontal = { 11: { x: 0.42 }, 12: { x: 0.58 }, 23: { x: 0.45 }, 24: { x: 0.55 } };

    it("asks to turn sideways when the shoulders look wide (facing the camera)", () => {
      const pose = buildStandingPose(Object.fromEntries(Object.entries(frontal).map(([index, value]) => [index, { ...value, y: Number(index) < 20 ? 0.3 : 0.55 }])));
      expect(assessFraming(pose, { aspectRatio: 1, cameraView: "side" })).toEqual({ isReady: false, issue: "not_side_view" });
      expect(assessFraming(pose, { aspectRatio: 1, cameraView: "front" })).toEqual({ isReady: true });
    });

    it("uses the calibrated limit (0.40): a 3/4 view at 0.44 is not sideways", () => {
      const pose = buildStandingPose({ 11: { x: 0.445, y: 0.3 }, 12: { x: 0.555, y: 0.3 }, 23: { x: 0.5, y: 0.55 }, 24: { x: 0.5, y: 0.55 } });
      expect(assessFraming(pose, { aspectRatio: 1, cameraView: "side" })).toEqual({ isReady: false, issue: "not_side_view" });
    });

    it("accepts a side view, where the shoulders overlap", () => {
      const pose = buildStandingPose({ 11: { x: 0.49, y: 0.3 }, 12: { x: 0.51, y: 0.3 }, 23: { x: 0.5, y: 0.55 }, 24: { x: 0.5, y: 0.55 } });
      expect(assessFraming(pose, { aspectRatio: 1, cameraView: "side" })).toEqual({ isReady: true });
    });

    it("corrects the aspect ratio before comparing widths", () => {
      const pose = buildStandingPose({ 11: { x: 0.46, y: 0.3 }, 12: { x: 0.54, y: 0.3 }, 23: { x: 0.5, y: 0.55 }, 24: { x: 0.5, y: 0.55 } });
      expect(assessFraming(pose, { aspectRatio: 1, cameraView: "side" })).toEqual({ isReady: true });
      expect(assessFraming(pose, { aspectRatio: 2, cameraView: "side" })).toEqual({ isReady: false, issue: "not_side_view" });
    });
  });

  it("treats landmarks without visibility as not visible", () => {
    const unknown = Object.fromEntries([0, 7, 8].map((index) => [index, { visibility: undefined }]));
    expect(assessFraming(buildStandingPose(unknown))).toEqual({ isReady: false, issue: "head_hidden" });
  });
});
