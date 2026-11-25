import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyzeTechniqueLink } from "./analyze-technique-link";

function mockCamera(getUserMedia: unknown): void {
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: getUserMedia ? { getUserMedia } : undefined });
}

describe("AnalyzeTechniqueLink", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("links supported exercises to the technique screen", () => {
    mockCamera(vi.fn());
    render(<AnalyzeTechniqueLink exerciseSlug="barbell-back-squat" />);
    expect(screen.getByRole("link", { name: "Analisar minha execução" })).toHaveAttribute("href", "/technique/barbell-back-squat");
  });

  it("is hidden for exercises without technique rules", () => {
    mockCamera(vi.fn());
    const { container } = render(<AnalyzeTechniqueLink exerciseSlug="leg-press" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is disabled with an explanation when the device has no camera access", () => {
    mockCamera(undefined);
    render(<AnalyzeTechniqueLink exerciseSlug="dumbbell-goblet-squat" />);
    const button = screen.getByRole("button", { name: /indisponível: seu aparelho ou navegador não permite usar a câmera/ });
    expect(button).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
