import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IDLE_STOP_MS } from "@/lib/constants/technique-rules";
import { buildSidePose, PARALLEL_BOTTOM, STANDING } from "@/lib/technique/squat/squat-test-poses";
import { useRepTracking } from "./use-rep-tracking";

const FRAME_MS = 100;
const ONE_REP = [STANDING, STANDING, PARALLEL_BOTTOM, PARALLEL_BOTTOM, STANDING];

function setup() {
  const dispatch = vi.fn(); // onFinish
  const { result } = renderHook(() => useRepTracking("squat", dispatch));
  const feed = (poses: typeof ONE_REP, startMs: number) =>
    act(() => poses.forEach((joints, index) => result.current.handlePose(buildSidePose(joints), 1, startMs + index * FRAME_MS)));
  return { dispatch, result, feed };
}

describe("useRepTracking", () => {
  it("ignores poses before the recording starts", () => {
    const { result, feed } = setup();
    feed(ONE_REP, 0);
    expect(result.current.repCount).toBe(0);
  });

  it("counts reps live and hands them to the summary on Encerrar", () => {
    const { dispatch, result, feed } = setup();
    act(() => result.current.startTracking());
    feed([...ONE_REP, ...ONE_REP], 0);
    expect(result.current.repCount).toBe(2);
    act(() => result.current.finishRecording());
    expect(dispatch).toHaveBeenCalledWith([expect.objectContaining({ repNumber: 1 }), expect.objectContaining({ repNumber: 2 })]);
  });

  it("stops by itself after standing still for the D8 time once", () => {
    const { dispatch, result, feed } = setup();
    act(() => result.current.startTracking());
    feed(ONE_REP, 0);
    const lastRepEndMs = (ONE_REP.length - 1) * FRAME_MS;
    feed([STANDING], lastRepEndMs + IDLE_STOP_MS);
    feed([STANDING], lastRepEndMs + IDLE_STOP_MS + FRAME_MS);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith([expect.objectContaining({ repNumber: 1 })]);
  });

  it("reports each new rep with its spoken cue (calibrated rules)", () => {
    const dispatch = vi.fn(); // onFinish
    const onRep = vi.fn();
    const { result } = renderHook(() => useRepTracking("squat", dispatch, onRep));
    act(() => result.current.startTracking());
    act(() => [...ONE_REP, ...ONE_REP].forEach((joints, index) => result.current.handlePose(buildSidePose(joints), 1, index * FRAME_MS)));
    expect(onRep.mock.calls).toEqual([[1, "fast_descent"], [2, "fast_descent"]]);
  });

  it("starts from zero on a new recording", () => {
    const { result, feed } = setup();
    act(() => result.current.startTracking());
    feed(ONE_REP, 0);
    act(() => result.current.startTracking());
    expect(result.current.repCount).toBe(0);
  });
});
