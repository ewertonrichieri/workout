import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SquatRep } from "@/lib/technique/squat/squat-rep-tracker";
import { TechniqueSummaryView } from "./technique-summary-view";

function rep(repNumber: number, overrides: Partial<SquatRep> = {}): SquatRep {
  return {
    repNumber, startMs: 0, bottomMs: 1500, endMs: 3000, descentMs: 1500, minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30,
    maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 30, seenFrameCount: 30, isEvaluated: true, ...overrides,
  };
}

const BASE_PROPS = { replay: null, exerciseSlug: "barbell-back-squat", cameraView: "side" as const };
const ANALYSIS = {
  id: "00000000-0000-4000-8000-0000000000aa", overallScore: 6, mainTip: "Desça mais.", strengths: [], corrections: [], hasLimitations: false,
  reps: [{ repNumber: 1, score: 9, isEvaluated: true, issues: [] }, { repNumber: 2, score: 4, isEvaluated: true, issues: [] }, { repNumber: 3, score: null, isEvaluated: false, issues: [] }],
};

describe("TechniqueSummaryView", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, data: ANALYSIS }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists each rep with its measures and the calibrated issues", () => {
    render(<TechniqueSummaryView reps={[rep(1), rep(2, { minThighAngle: 20 }), rep(3, { isEvaluated: false })]} onRecordAgain={vi.fn()} {...BASE_PROPS} />);
    expect(screen.getByText("3 repetições contadas")).toBeInTheDocument();
    expect(screen.queryByText(/Os limites ainda estão em calibração/)).not.toBeInTheDocument();
    const cards = screen.getAllByRole("listitem").filter((item) => item.querySelector("h3"));
    expect(within(cards[0]!).getByText("Nada a apontar nesta repetição.")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("Corrigir: a coxa não chegou à linha do joelho (paralela)")).toBeInTheDocument();
    expect(within(cards[2]!).getByText(/Não avaliada/)).toBeInTheDocument();
  });

  it("asks the AI once and shows its score for the set and for each rep", async () => {
    render(<TechniqueSummaryView reps={[rep(1), rep(2, { minThighAngle: 20 }), rep(3, { isEvaluated: false })]} onRecordAgain={vi.fn()} {...BASE_PROPS} />);
    expect(await screen.findByText("Nota da série: 6/10")).toBeInTheDocument();
    const cards = screen.getAllByRole("listitem").filter((item) => item.querySelector("h3"));
    expect(within(cards[0]!).getByText("Nota: 9/10")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("Nota: 4/10")).toBeInTheDocument();
    expect(within(cards[2]!).queryByText(/Nota:/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/não permite gravar o replay/)).toBeInTheDocument();
  });

  it("asks to record again when nothing was counted", () => {
    const onRecordAgain = vi.fn();
    render(<TechniqueSummaryView reps={[]} onRecordAgain={onRecordAgain} {...BASE_PROPS} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não contamos nenhuma repetição");
    fireEvent.click(screen.getByRole("button", { name: "Gravar de novo" }));
    expect(onRecordAgain).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks to record again when most reps could not be seen", () => {
    render(<TechniqueSummaryView reps={[rep(1, { isEvaluated: false }), rep(2, { isEvaluated: false }), rep(3)]} onRecordAgain={vi.fn()} {...BASE_PROPS} />);
    expect(screen.getByRole("alert")).toHaveTextContent("mais da metade das repetições");
  });
});
