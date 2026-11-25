import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TechniqueAnalysisPanel } from "./technique-analysis-panel";

const RESULT = {
  id: "00000000-0000-4000-8000-0000000000aa", overallScore: 7, mainTip: "Desça até a coxa ficar paralela.",
  strengths: ["Boa descida controlada."], corrections: [{ issue: "shallow_depth" as const, repNumbers: [2, 3], text: "A coxa ficou acima da paralela." }],
  reps: [], hasLimitations: true,
};

describe("TechniqueAnalysisPanel", () => {
  it("shows the score, the main tip, strengths, corrections and the health reminder", () => {
    render(<TechniqueAnalysisPanel state={{ status: "success", result: RESULT }} onRetry={vi.fn()} />);
    expect(screen.getByText("Nota da série: 7/10")).toBeInTheDocument();
    expect(screen.getByText("Desça até a coxa ficar paralela.")).toBeInTheDocument();
    expect(screen.getByText("Boa descida controlada.")).toBeInTheDocument();
    expect(screen.getByText("A coxa ficou acima da paralela. (2ª e 3ª repetições)")).toBeInTheDocument();
    expect(screen.getByText(/lesão ou limitação/)).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    render(<TechniqueAnalysisPanel state={{ status: "loading" }} onRetry={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Analisando sua série com a IA");
  });

  it("keeps the summary usable when the AI fails and lets the user retry", () => {
    const onRetry = vi.fn();
    render(<TechniqueAnalysisPanel state={{ status: "error", message: "A IA está indisponível no momento." }} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("A IA está indisponível no momento.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
