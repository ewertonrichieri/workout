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

  it("treats landmarks without visibility as not visible", () => {
    const unknown = Object.fromEntries([0, 7, 8].map((index) => [index, { visibility: undefined }]));
    expect(assessFraming(buildStandingPose(unknown))).toEqual({ isReady: false, issue: "head_hidden" });
  });
});
