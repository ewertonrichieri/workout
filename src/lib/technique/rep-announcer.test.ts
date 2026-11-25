import { describe, expect, it, vi } from "vitest";
import { MIN_CUE_INTERVAL_MS } from "@/lib/constants/technique";
import { createRepAnnouncer } from "./rep-announcer";

function setup() {
  let nowMs = 0;
  const speak = vi.fn();
  const announcer = createRepAnnouncer({ speak, now: () => nowMs });
  return { speak, announcer, advance: (ms: number) => (nowMs += ms) };
}

describe("createRepAnnouncer", () => {
  it("says the count, followed by the cue when there is one", () => {
    const { speak, announcer } = setup();
    announcer.announceRep(1, null);
    announcer.announceRep(2, "Desça mais");
    expect(speak.mock.calls).toEqual([["1"], ["2. Desça mais"]]);
  });

  it("keeps a minimum interval between cues so the count is never drowned out", () => {
    const { speak, announcer, advance } = setup();
    announcer.announceRep(1, "Desça mais");
    advance(MIN_CUE_INTERVAL_MS - 1);
    announcer.announceRep(2, "Desça mais");
    advance(1);
    announcer.announceRep(3, "Mais devagar");
    expect(speak.mock.calls).toEqual([["1. Desça mais"], ["2"], ["3. Mais devagar"]]);
  });

  it("returns the cue that was shown, even when not spoken (screen fallback)", () => {
    const { announcer } = setup();
    expect(announcer.announceRep(1, "Desça mais")).toBe("Desça mais");
    expect(announcer.announceRep(2, "Desça mais")).toBe("Desça mais");
  });
});
