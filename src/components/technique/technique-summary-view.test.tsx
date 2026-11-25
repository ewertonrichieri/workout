import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TECHNIQUE_EXERCISES } from "@/lib/constants/technique";
import { buildRep } from "@/lib/technique/patterns/test-reps";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { TechniqueSummaryView } from "./technique-summary-view";

type RepChange = Partial<Omit<TechniqueRep, "metrics">> & { minThighAngle?: number };

function rep(repNumber: number, { minThighAngle, ...overrides }: RepChange = {}): TechniqueRep {
  return buildRep(repNumber, overrides, minThighAngle === undefined ? {} : { minThighAngle });
}

const BASE_PROPS = { replay: null, exerciseSlug: "barbell-back-squat", ruleSet: TECHNIQUE_EXERCISES["barbell-back-squat"]! };
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
