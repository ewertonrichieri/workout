import { describe, expect, it } from "vitest";
import { IDLE_STOP_MS } from "@/lib/constants/technique-rules";
import type { SquatMeasures } from "./squat-frame";
import { createSquatRepTracker } from "./squat-rep-tracker";

const FRAME_MS = 100;
const BASE: SquatMeasures = { kneeAngle: 175, thighAngle: 80, trunkLean: 10, heelToToeRatio: 0, kneeTravelRatio: -0.3 };

type FrameSpec = number | null | Partial<SquatMeasures>;

/** Feeds knee angles (or partial measures; null = joints not seen), one frame every 100 ms. */
function feed(specs: readonly FrameSpec[], startMs = 0) {
  const tracker = createSquatRepTracker();
  specs.forEach((spec, index) => {
    const measures = spec === null ? null : typeof spec === "number" ? { ...BASE, kneeAngle: spec } : { ...BASE, ...spec };
    tracker.addFrame({ timestampMs: startMs + index * FRAME_MS, measures });
  });
  return tracker;
}

const ONE_REP = [175, 175, 155, 140, 110, 90, 95, 120, 150, 165, 175];

describe("createSquatRepTracker", () => {
  it("counts a rep that goes down and comes back up, with its timing", () => {
    const tracker = feed(ONE_REP);
    expect(tracker.repCount).toBe(1);
    expect(tracker.finish()).toEqual([
      expect.objectContaining({ repNumber: 1, startMs: 100, bottomMs: 500, endMs: 900, descentMs: 400, minKneeAngle: 90, isEvaluated: true }),
    ]);
  });

  it("does not count jitter near the top or a movement too small to be a squat", () => {
    expect(feed([175, 158, 152, 161, 157, 175]).repCount).toBe(0);
    expect(feed([175, 148, 145, 148, 165]).repCount).toBe(0);
  });

  it("waits for the user to stand before counting", () => {
    expect(feed([100, 90, 120, 165, 170]).repCount).toBe(0);
    expect(feed([100, 90, 165, ...ONE_REP]).repCount).toBe(1);
  });

  it("numbers consecutive reps", () => {
    const tracker = feed([...ONE_REP, ...ONE_REP, ...ONE_REP]);
    expect(tracker.finish().map((rep) => rep.repNumber)).toEqual([1, 2, 3]);
  });

  it("keeps the extremes of each rep", () => {
    const tracker = feed([175, 140, { kneeAngle: 90, thighAngle: -5, trunkLean: 38, kneeTravelRatio: 0.1 }, { kneeAngle: 120, trunkLean: 42 }, 175]);
    expect(tracker.finish()[0]).toMatchObject({ minThighAngle: -5, maxTrunkLean: 42, maxKneeTravelRatio: 0.1 });
  });

  it("measures the heel rise against the last standing frame", () => {
    const tracker = feed([{ kneeAngle: 175, heelToToeRatio: 0.02 }, 140, { kneeAngle: 90, heelToToeRatio: 0.14 }, 175]);
    expect(tracker.finish()[0]?.maxHeelRiseRatio).toBeCloseTo(0.12);
  });

  it("marks a rep as not evaluated when too many frames were not seen, and still counts it", () => {
    const tracker = feed([175, 140, null, null, 90, null, 120, 175]);
    expect(tracker.repCount).toBe(1);
    expect(tracker.finish()[0]).toMatchObject({ isEvaluated: false, frameCount: 6, seenFrameCount: 3 });
  });

  it("keeps a rep evaluated with a few unseen frames", () => {
    const tracker = feed([175, 140, 120, null, 90, 100, 120, 150, 175]);
    expect(tracker.finish()[0]?.isEvaluated).toBe(true);
  });

  it("ignores the rep in progress when the recording ends", () => {
    const tracker = feed([...ONE_REP, 140, 100]);
    expect(tracker.finish()).toHaveLength(1);
  });

  it("is idle after standing still for the D8 time once at least one rep was done", () => {
    const tracker = feed(ONE_REP);
    const lastRepEndMs = 900;
    expect(tracker.isIdle(lastRepEndMs + IDLE_STOP_MS - 1)).toBe(false);
    expect(tracker.isIdle(lastRepEndMs + IDLE_STOP_MS)).toBe(true);
    expect(feed([175, 175]).isIdle(IDLE_STOP_MS * 2)).toBe(false);
    expect(feed([175, 140, 100]).isIdle(IDLE_STOP_MS * 2)).toBe(false);
  });
});
