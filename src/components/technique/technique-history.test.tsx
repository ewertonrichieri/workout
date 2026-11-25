import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE_UNDO_WINDOW_MS } from "@/lib/constants/technique-analysis";
import { TechniqueHistory } from "./technique-history";

function item(index: number) {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`, createdAt: `2026-11-2${index}T12:00:00+00:00`, date: `2026-11-2${index}`, overallScore: 5 + index, repCount: 5, evaluatedRepCount: 4,
    mainTip: `Dica ${index}.`, frequentIssues: index === 1 ? [{ issue: "shallow_depth", repCount: 3 }, { issue: "fast_descent", repCount: 1 }] : [],
  };
}

function page(items: unknown[], pageNumber: number, total: number) {
  return new Response(JSON.stringify({ success: true, data: { items, total, page: pageNumber, pageSize: 10 } }), { status: 200 });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("TechniqueHistory (step 5.5)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("lists the analyses with score, reps, frequent issues and tip, and loads more", async () => {
    fetchMock.mockResolvedValueOnce(page([item(1)], 1, 2)).mockResolvedValueOnce(page([item(2)], 2, 2));
    render(<TechniqueHistory exerciseSlug="barbell-back-squat" />);
    expect(await screen.findByText(/· Nota 6\/10$/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("4 de 5 repetições avaliadas")).toBeInTheDocument();
    expect(screen.getByText("Mais frequente: profundidade (3×), descida rápida (1×)")).toBeInTheDocument();
    expect(screen.getByText("Dica 1.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/technique-analyses?exercise=barbell-back-squat&page=1", { method: "GET" });
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(await screen.findByText("Dica 2.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    fetchMock.mockResolvedValueOnce(page([], 1, 0));
    render(<TechniqueHistory exerciseSlug="barbell-back-squat" />);
    expect(await screen.findByText(/Nenhuma análise ainda/)).toBeInTheDocument();
  });

  it("deletes only after the undo window, and Desfazer brings the analysis back", async () => {
    fetchMock.mockResolvedValueOnce(page([item(1), item(2)], 1, 2));
    render(<TechniqueHistory exerciseSlug="barbell-back-squat" />);
    await screen.findByText("Dica 1.");
    vi.useFakeTimers();
    fireEvent.click(screen.getAllByRole("button", { name: /Apagar a análise/ })[0]!);
    expect(screen.queryByText("Dica 1.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getByText("Dica 1.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(DELETE_UNDO_WINDOW_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { id: item(1).id } }), { status: 200 }));
    fireEvent.click(screen.getAllByRole("button", { name: /Apagar a análise/ })[0]!);
    act(() => vi.advanceTimersByTime(DELETE_UNDO_WINDOW_MS));
    await flush();
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/technique-analyses/${item(1).id}`, { method: "DELETE", keepalive: true });
    expect(screen.queryByText("Dica 1.")).not.toBeInTheDocument();
  });

  it("brings the analysis back when the deletion fails", async () => {
    fetchMock.mockResolvedValueOnce(page([item(1)], 1, 1));
    render(<TechniqueHistory exerciseSlug="barbell-back-squat" />);
    await screen.findByText("Dica 1.");
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "Erro." }), { status: 500 }));
    fireEvent.click(screen.getByRole("button", { name: /Apagar a análise/ }));
    act(() => vi.advanceTimersByTime(DELETE_UNDO_WINDOW_MS));
    await flush();
    await flush();
    expect(screen.getByText("Dica 1.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível apagar a análise.");
  });
});
