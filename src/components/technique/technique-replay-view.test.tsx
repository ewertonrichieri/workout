import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TechniqueReplay } from "@/lib/technique/replay";
import { TechniqueReplayView } from "./technique-replay-view";

const REPLAY: TechniqueReplay = { video: new Blob(["fictional"], { type: "video/webm" }), startedAtMs: 0, frames: [] };
const MARKERS = [
  { repNumber: 1, startSeconds: 0.5, endSeconds: 2.5, needsCorrection: false },
  { repNumber: 2, startSeconds: 3, endSeconds: 5, needsCorrection: true },
];

describe("TechniqueReplayView", () => {
  const revokeObjectURL = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:fictional"), revokeObjectURL }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("plays the in-memory video and jumps to each rep, marking the ones to fix", () => {
    const { unmount } = render(<TechniqueReplayView replay={REPLAY} markers={MARKERS} />);
    const video = screen.getByLabelText("Replay da série com o esqueleto desenhado") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("blob:fictional");
    fireEvent.click(screen.getByRole("button", { name: "Ir para a 2ª repetição (com ponto a corrigir)" }));
    expect(video.currentTime).toBeCloseTo(3.1);
    expect(screen.getByRole("button", { name: "Ir para a 1ª repetição" })).toBeInTheDocument();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fictional");
  });
});
