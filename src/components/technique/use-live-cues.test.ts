import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CameraPhase } from "./camera-controls";
import { useLiveCues } from "./use-live-cues";
import type { SpeechControls } from "./use-speech";

function speechWith(speak: SpeechControls["speak"]): SpeechControls {
  return { isSupported: true, isEnabled: true, toggle: vi.fn(), speak };
}

describe("useLiveCues", () => {
  it("speaks the countdown and 'Já!' when the recording starts", () => {
    const speak = vi.fn();
    const speech = speechWith(speak);
    const { result, rerender } = renderHook(({ phase, seconds }: { phase: CameraPhase; seconds: number }) => useLiveCues(phase, seconds, speech), {
      initialProps: { phase: "framing", seconds: 0 },
    });
    act(() => result.current.announceStart());
    rerender({ phase: "countdown", seconds: 0 });
    rerender({ phase: "countdown", seconds: 1 });
    rerender({ phase: "countdown", seconds: 2 });
    rerender({ phase: "countdown", seconds: 3 });
    rerender({ phase: "recording", seconds: 0 });
    expect(speak.mock.calls).toEqual([["3"], ["2"], ["1"], ["Já!"]]);
  });

  it("speaks each rep with its cue and keeps the last cue on screen", () => {
    const speak = vi.fn();
    const speech = speechWith(speak);
    const { result } = renderHook(() => useLiveCues("recording", 0, speech));
    act(() => result.current.handleRep(1, null));
    expect(result.current.lastCue).toBeNull();
    act(() => result.current.handleRep(2, "shallow_depth"));
    expect(speak).toHaveBeenLastCalledWith("2. Desça mais");
    expect(result.current.lastCue).toBe("Desça mais");
    act(() => result.current.resetCues());
    expect(result.current.lastCue).toBeNull();
  });
});
