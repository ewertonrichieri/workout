import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FRAMING_HOLD_MS } from "@/lib/constants/technique";
import type { PoseLandmark } from "@/lib/technique/body-framing";
import { POSE_LANDMARK_COUNT } from "@/lib/technique/pose-landmarks";
import type { PoseDetector } from "./pose-detector";
import { usePoseTracking } from "./use-pose-tracking";

const FRAME_MS = 16;
const STANDING_POSE: PoseLandmark[] = Array.from({ length: POSE_LANDMARK_COUNT }, (_, index) => ({ x: 0.5, y: 0.1 + (index / POSE_LANDMARK_COUNT) * 0.8, visibility: 0.9 }));

function buildRefs() {
  const context = { canvas: { width: 0, height: 0 }, clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn() };
  (context.canvas as unknown as { getContext: () => unknown }).getContext = () => context;
  const video = { readyState: 4, videoWidth: 640, videoHeight: 480 };
  return {
    videoRef: { current: video as unknown as HTMLVideoElement },
    canvasRef: { current: context.canvas as unknown as HTMLCanvasElement },
    context,
  };
}

describe("usePoseTracking", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] }));
  afterEach(() => vi.useRealTimers());

  it("draws the skeleton and becomes stable after the body stays framed for the hold", () => {
    const detector: PoseDetector = { detect: vi.fn(() => STANDING_POSE), close: vi.fn() };
    const { videoRef, canvasRef, context } = buildRefs();
    const { result } = renderHook(() => usePoseTracking({ videoRef, canvasRef, detector, isActive: true }));
    act(() => vi.advanceTimersByTime(FRAME_MS * 2));
    expect(result.current).toEqual({ framing: { isReady: true }, isStable: false });
    expect(context.canvas).toMatchObject({ width: 640, height: 480 });
    expect(context.stroke).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(FRAMING_HOLD_MS + FRAME_MS));
    expect(result.current.isStable).toBe(true);
  });

  it("reports the framing issue when nobody is in the image", () => {
    const detector: PoseDetector = { detect: vi.fn(() => []), close: vi.fn() };
    const { videoRef, canvasRef } = buildRefs();
    const { result } = renderHook(() => usePoseTracking({ videoRef, canvasRef, detector, isActive: true }));
    act(() => vi.advanceTimersByTime(FRAME_MS * 2));
    expect(result.current).toEqual({ framing: { isReady: false, issue: "no_person" }, isStable: false });
  });

  it("does not analyze while inactive", () => {
    const detector: PoseDetector = { detect: vi.fn(() => STANDING_POSE), close: vi.fn() };
    const { videoRef, canvasRef } = buildRefs();
    renderHook(() => usePoseTracking({ videoRef, canvasRef, detector, isActive: false }));
    act(() => vi.advanceTimersByTime(FRAME_MS * 4));
    expect(detector.detect).not.toHaveBeenCalled();
  });
});
