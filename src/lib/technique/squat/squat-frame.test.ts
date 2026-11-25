import { describe, expect, it } from "vitest";
import { measureSquatFrame } from "./squat-frame";
import { buildSidePose, PARALLEL_BOTTOM, STANDING } from "./squat-test-poses";

const SQUARE = 1;

describe("measureSquatFrame", () => {
  it("measures a standing frame", () => {
    const measures = measureSquatFrame(buildSidePose(STANDING), SQUARE);
    expect(measures?.kneeAngle).toBeCloseTo(180);
    expect(measures?.thighAngle).toBeCloseTo(90);
    expect(measures?.trunkLean).toBeCloseTo(0);
    expect(measures?.heelToToeRatio).toBeCloseTo(0);
    expect(measures?.kneeTravelRatio).toBeCloseTo(-0.3);
  });

  it("measures the bottom of a parallel squat", () => {
    const measures = measureSquatFrame(buildSidePose(PARALLEL_BOTTOM), SQUARE);
    expect(measures?.kneeAngle).toBeCloseTo(63.43, 1);
    expect(measures?.thighAngle).toBeCloseTo(0);
    expect(measures?.trunkLean).toBeCloseTo(30.96, 1);
  });

  it("uses whichever side the camera sees", () => {
    const left = measureSquatFrame(buildSidePose(PARALLEL_BOTTOM, "left"), SQUARE);
    expect(left?.kneeAngle).toBeCloseTo(63.43, 1);
  });

  it("measures the heel rising towards the toe level relative to the shin", () => {
    const raised = { ...STANDING, heel: { x: 0.47, y: 0.88 } };
    expect(measureSquatFrame(buildSidePose(raised), SQUARE)?.heelToToeRatio).toBeCloseTo(0.2);
  });

  it("returns null when a joint used by the rules is not seen (never guesses)", () => {
    expect(measureSquatFrame(buildSidePose(STANDING, "right", 0.3), SQUARE)).toBeNull();
    expect(measureSquatFrame([], SQUARE)).toBeNull();
  });

  it("corrects the image aspect ratio before measuring angles", () => {
    const wide = { ...PARALLEL_BOTTOM, hip: { x: 0.45, y: 0.7 }, knee: { x: 0.55, y: 0.7 } };
    // On a 2:1 image a 0.1 horizontal step is as long as a 0.2 vertical step.
    expect(measureSquatFrame(buildSidePose(wide), 2)?.thighAngle).toBeCloseTo(0);
    const tilted = { ...STANDING, shoulder: { x: 0.6, y: 0.3 } };
    expect(measureSquatFrame(buildSidePose(tilted), 2)?.trunkLean).toBeCloseTo(45);
  });
});
