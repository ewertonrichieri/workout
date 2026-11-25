import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SquatRep } from "@/lib/technique/squat/squat-rep-tracker";
import { TechniqueSummaryView } from "./technique-summary-view";

function rep(repNumber: number, overrides: Partial<SquatRep> = {}): SquatRep {
  return {
    repNumber, startMs: 0, bottomMs: 1500, endMs: 3000, descentMs: 1500, minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30,
    maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 30, seenFrameCount: 30, isEvaluated: true, ...overrides,
  };
}

describe("TechniqueSummaryView", () => {
  it("lists each rep with its measures and, before calibration, issues only as 'Para conferir'", () => {
    render(<TechniqueSummaryView reps={[rep(1), rep(2, { minThighAngle: 20 }), rep(3, { isEvaluated: false })]} onRecordAgain={vi.fn()} />);
    expect(screen.getByText("3 repetições contadas")).toBeInTheDocument();
    expect(screen.getByText(/Os limites ainda estão em calibração/)).toBeInTheDocument();
    const cards = screen.getAllByRole("listitem").filter((item) => item.querySelector("h3"));
    expect(within(cards[0]!).getByText("Nada a apontar nesta repetição.")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("Para conferir: a coxa não chegou à linha do joelho (paralela)")).toBeInTheDocument();
    expect(within(cards[2]!).getByText(/Não avaliada/)).toBeInTheDocument();
  });

  it("asks to record again when nothing was counted", () => {
    const onRecordAgain = vi.fn();
    render(<TechniqueSummaryView reps={[]} onRecordAgain={onRecordAgain} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não contamos nenhuma repetição");
    fireEvent.click(screen.getByRole("button", { name: "Gravar de novo" }));
    expect(onRecordAgain).toHaveBeenCalled();
  });

  it("asks to record again when most reps could not be seen", () => {
    render(<TechniqueSummaryView reps={[rep(1, { isEvaluated: false }), rep(2, { isEvaluated: false }), rep(3)]} onRecordAgain={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("mais da metade das repetições");
  });
});
