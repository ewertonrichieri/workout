import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutEditor } from "./workout-editor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const ID_1 = "11111111-1111-4111-8111-111111111111";
const ID_2 = "22222222-2222-4222-8222-222222222222";
const WORKOUT = buildWorkout("A", 1, [buildWorkoutExercise(1, { id: ID_1 }), buildWorkoutExercise(2, { id: ID_2, notes: "Devagar" })]);
const NAME_1 = "Exercício falso 1";
const NAME_2 = "Exercício falso 2";

afterEach(() => vi.unstubAllGlobals());

function exerciseNames(): string[] {
  const list = screen.getByRole("list", { name: "Exercícios do treino A" });
  return within(list).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent ?? "");
}

describe("simplified workout editor (spec 015)", () => {
  it("shows each exercise collapsed with a summary and opens it on Editar", () => {
    render(<WorkoutEditor workout={WORKOUT} />);
    expect(screen.getAllByText("3 séries · 8 a 12 repetições · Descanso: 1 min")).toHaveLength(2);
    expect(screen.queryByLabelText(`Séries de ${NAME_1}`)).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: `Editar ${NAME_1}` });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(`Séries de ${NAME_1}`)).toHaveValue(3);
    const more = screen.getByLabelText(`Observação de ${NAME_1}`).closest("details");
    expect(more).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: `Fechar edição de ${NAME_1}` }));
    expect(screen.queryByLabelText(`Séries de ${NAME_1}`)).not.toBeInTheDocument();
  });

  it("marks an invalid summary and opens the exercises with errors when saving", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WorkoutEditor workout={WORKOUT} />);
    fireEvent.click(screen.getByRole("button", { name: `Editar ${NAME_2}` }));
    fireEvent.change(screen.getByLabelText(`Observação de ${NAME_2}`), { target: { value: "x".repeat(600) } });
    fireEvent.click(screen.getByRole("button", { name: `Fechar edição de ${NAME_2}` }));
    expect(screen.getByText("Valores a conferir")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    const notes = screen.getByLabelText(`Observação de ${NAME_2}`);
    expect(notes).toHaveAttribute("aria-invalid", "true");
    expect(notes.closest("details")).toHaveAttribute("open");
  });

  it("removes an exercise with undo back at the same position", () => {
    render(<WorkoutEditor workout={WORKOUT} />);
    fireEvent.click(screen.getByRole("button", { name: `Editar ${NAME_1}` }));
    fireEvent.click(screen.getByRole("button", { name: `Remover ${NAME_1}` }));
    expect(exerciseNames()).toEqual([NAME_2]);
    expect(screen.getByRole("status")).toHaveTextContent(`${NAME_1} removido do treino.`);
    fireEvent.click(screen.getByRole("button", { name: `Desfazer remoção de ${NAME_1}` }));
    expect(exerciseNames()).toEqual([NAME_1, NAME_2]);
    expect(screen.queryByRole("button", { name: `Desfazer remoção de ${NAME_1}` })).not.toBeInTheDocument();
  });
});
