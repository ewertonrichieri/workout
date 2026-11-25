import { describe, expect, it } from "vitest";
import { buildReplayMarkers, findFrameAt, findMarkerAt, pickRecorderMimeType, type ReplayFrame } from "./replay";
import type { SquatRep } from "./squat/squat-rep-tracker";

const FRAMES: ReplayFrame[] = [0, 100, 200, 300].map((offsetMs) => ({ offsetMs, landmarks: [{ x: offsetMs / 1000, y: 0, visibility: 1 }] }));

function rep(repNumber: number, startMs: number, endMs: number): SquatRep {
  return {
    repNumber, startMs, bottomMs: startMs + 500, endMs, descentMs: 500, minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30,
    maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 30, seenFrameCount: 30, isEvaluated: true,
  };
}

describe("replay helpers", () => {
  it("finds the pose shown at a video time (latest frame not after it)", () => {
    expect(findFrameAt(FRAMES, 150)?.offsetMs).toBe(100);
    expect(findFrameAt(FRAMES, 300)?.offsetMs).toBe(300);
    expect(findFrameAt(FRAMES, 5000)?.offsetMs).toBe(300);
    expect(findFrameAt(FRAMES, -1)).toBeUndefined();
    expect(findFrameAt([], 100)).toBeUndefined();
  });

  it("places each rep on the video timeline and marks the ones with something to fix", () => {
    const markers = buildReplayMarkers([rep(1, 10_500, 12_500), rep(2, 13_000, 15_000)], 10_000, new Set([2]));
    expect(markers).toEqual([
      { repNumber: 1, startSeconds: 0.5, endSeconds: 2.5, needsCorrection: false },
      { repNumber: 2, startSeconds: 3, endSeconds: 5, needsCorrection: true },
    ]);
    expect(findMarkerAt(markers, 4)?.repNumber).toBe(2);
    expect(findMarkerAt(markers, 2.7)).toBeUndefined();
  });

  it("picks the first video format the browser can record", () => {
    expect(pickRecorderMimeType((type) => type === "video/mp4")).toBe("video/mp4");
    expect(pickRecorderMimeType(() => true)).toBe("video/webm;codecs=vp9");
    expect(pickRecorderMimeType(() => false)).toBeUndefined();
  });
});
