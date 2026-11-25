import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FRAMING_LOSS_TOLERANCE_MS } from "@/lib/constants/technique";
import { useFramingLossGuard } from "./use-framing-loss-guard";

describe("useFramingLossGuard", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reports the loss only after the body stays out of frame for the tolerance", () => {
    const onLost = vi.fn();
    renderHook(() => useFramingLossGuard(true, false, onLost));
    vi.advanceTimersByTime(FRAMING_LOSS_TOLERANCE_MS - 1);
    expect(onLost).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  it("ignores a short glitch of the pose model", () => {
    const onLost = vi.fn();
    const { rerender } = renderHook(({ isFramed }) => useFramingLossGuard(true, isFramed, onLost), { initialProps: { isFramed: false } });
    vi.advanceTimersByTime(200);
    rerender({ isFramed: true });
    vi.advanceTimersByTime(FRAMING_LOSS_TOLERANCE_MS);
    expect(onLost).not.toHaveBeenCalled();
  });

  it("does nothing while inactive", () => {
    const onLost = vi.fn();
    renderHook(() => useFramingLossGuard(false, false, onLost));
    vi.advanceTimersByTime(FRAMING_LOSS_TOLERANCE_MS * 2);
    expect(onLost).not.toHaveBeenCalled();
  });
});
