import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExerciseProgress, SessionHistoryPage } from "@/lib/training/history-service";
import { ExerciseProgressView } from "./exercise-progress-view";
import { SessionHistoryList } from "./session-history-list";

const HISTORY: SessionHistoryPage = {
  items: [
    { id: "s2", date: "2026-11-24", workoutLabel: "A", setCount: 12 },
    { id: "s1", date: "2026-11-20", workoutLabel: null, setCount: 1 },
  ],
  page: 1, pageSize: 20, total: 21, totalPages: 2,
};

const PROGRESS: ExerciseProgress = {
  exercise: { slug: "fake-press", name: "Supino falso" },
  entries: [
    { sessionId: "s1", date: "2026-11-20", maxLoadKg: 20, repsAtMaxLoad: 10, setCount: 3 },
    { sessionId: "s2", date: "2026-11-22", maxLoadKg: null, repsAtMaxLoad: null, setCount: 2 },
    { sessionId: "s3", date: "2026-11-24", maxLoadKg: 22.5, repsAtMaxLoad: 8, setCount: 3 },
  ],
};

describe("SessionHistoryList", () => {
  it("lists finished workouts with date, label and set count, paginated", () => {
    render(<SessionHistoryList history={HISTORY} />);
    const list = screen.getByRole("list", { name: "Treinos finalizados" });
    expect(within(list).getByText("24/11/2026")).toBeInTheDocument();
    expect(within(list).getByText("Treino A")).toBeInTheDocument();
    expect(within(list).getByText("12 séries registradas")).toBeInTheDocument();
    expect(within(list).getByText("Treino removido")).toBeInTheDocument();
    expect(within(list).getByText("1 série registrada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute("href", "/schedule?page=2");
  });

  it("shows the empty state without sessions", () => {
    render(<SessionHistoryList history={{ ...HISTORY, items: [], total: 0, totalPages: 0 }} />);
    expect(screen.getByRole("heading", { name: "Nenhum treino registrado" })).toBeInTheDocument();
  });
});

describe("ExerciseProgressView", () => {
  it("describes the chart and lists every session in an accessible table, newest first", () => {
    render(<ExerciseProgressView progress={PROGRESS} />);
    expect(screen.getByRole("img", { name: "Gráfico da maior carga por sessão de Supino falso: de 20 kg em 20/11/2026 a 22,5 kg em 24/11/2026." })).toBeInTheDocument();
    const rows = within(screen.getByRole("table", { name: "Sessões de Supino falso" })).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["24/11/2026", "22,5 kg", "8", "3"]);
    expect(within(rows[2]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["22/11/2026", "Sem carga", "—", "2"]);
  });

  it("shows the tooltip of the session chosen with the keyboard", () => {
    render(<ExerciseProgressView progress={PROGRESS} />);
    const chart = screen.getByRole("group", { name: "Use as setas para percorrer as sessões." });
    fireEvent.focus(chart);
    expect(within(chart).getByText("24/11/2026 · 22,5 kg")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(within(chart).getByText("20/11/2026 · 20 kg")).toBeInTheDocument();
  });

  it("explains when there is no history or no load at all", () => {
    const { unmount } = render(<ExerciseProgressView progress={{ ...PROGRESS, entries: [] }} />);
    expect(screen.getByRole("heading", { name: "Nenhuma carga registrada ainda" })).toBeInTheDocument();
    unmount();
    render(<ExerciseProgressView progress={{ ...PROGRESS, entries: [PROGRESS.entries[1]] }} />);
    expect(screen.getByText("As sessões registradas não têm carga (peso corporal). Veja os detalhes na tabela.")).toBeInTheDocument();
  });
});
