import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutTracker } from "./workout-tracker";

const RANGE = buildWorkoutExercise(1, { sets: 2 });
const FIXED = buildWorkoutExercise(2, { sets: 2, repsMin: 10, repsMax: 10, restSeconds: null });
const WORKOUT = buildWorkout("A", 1, [RANGE, FIXED]);
const RANGE_NAME = "Exercício falso 1";
const FIXED_NAME = "Exercício falso 2";

afterEach(() => window.localStorage.clear());

function renderTracker() {
  return render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
}

describe("simplified workout card (spec 015)", () => {
  it("shows the prescription in one line and keeps the secondary actions in Mais opções", () => {
    renderTracker();
    expect(screen.getByText("2 séries · 8 a 12 repetições · Descanso: 1 min")).toBeInTheDocument();
    expect(screen.getByText("2 séries · 10 repetições")).toBeInTheDocument();
    const more = screen.getByText("Mais opções", { selector: `summary[aria-label="Mais opções de ${RANGE_NAME}"]` }).closest("details");
    if (!more) throw new Error("Mais opções not rendered");
    expect(more).not.toHaveAttribute("open");
    expect(within(more).getByText("Ver demonstração")).toBeInTheDocument();
    expect(within(more).getByRole("button", { name: "Trocar exercício" })).toBeInTheDocument();
    expect(within(more).getByRole("link", { name: "Ver evolução" })).toBeInTheDocument();
    expect(within(more).getByRole("switch", { name: `Salvar carga para progredir em ${RANGE_NAME}` })).toBeInTheDocument();
  });

  it("checks a fixed-reps set in one tap, filling the prescription", () => {
    renderTracker();
    expect(screen.getByLabelText(`Repetições da série 1 de ${FIXED_NAME}`)).toHaveAttribute("placeholder", "10");
    fireEvent.click(screen.getByRole("checkbox", { name: `Concluir série 1 de ${FIXED_NAME}` }));
    expect(screen.getByLabelText(`Repetições da série 1 de ${FIXED_NAME}`)).toHaveValue("10");
    expect(screen.getByRole("checkbox", { name: `Concluir série 1 de ${FIXED_NAME}` })).toBeChecked();
  });

  it("repeats the previous set of a range in one tap, keeping the first set typed", () => {
    renderTracker();
    expect(screen.getByRole("checkbox", { name: `Concluir série 1 de ${RANGE_NAME}` })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(`Repetições da série 1 de ${RANGE_NAME}`), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText(`Carga (kg) da série 1 de ${RANGE_NAME}`), { target: { value: "22,5" } });
    expect(screen.getByLabelText(`Repetições da série 2 de ${RANGE_NAME}`)).toHaveAttribute("placeholder", "11");
    fireEvent.click(screen.getByRole("checkbox", { name: `Concluir série 2 de ${RANGE_NAME}` }));
    expect(screen.getByLabelText(`Repetições da série 2 de ${RANGE_NAME}`)).toHaveValue("11");
    expect(screen.getByLabelText(`Carga (kg) da série 2 de ${RANGE_NAME}`)).toHaveValue("22,5");
  });

  it("collapses the chosen effort into one button that reopens the choice", () => {
    renderTracker();
    fireEvent.click(screen.getByRole("checkbox", { name: `Concluir série 1 de ${FIXED_NAME}` }));
    const effort = screen.getByRole("radiogroup", { name: `Esforço da série 1 de ${FIXED_NAME}` });
    fireEvent.click(within(effort).getByRole("radio", { name: "Ok" }));
    expect(screen.queryByRole("radiogroup", { name: `Esforço da série 1 de ${FIXED_NAME}` })).not.toBeInTheDocument();
    const chosen = screen.getByRole("button", { name: `Esforço da série 1 de ${FIXED_NAME}: Ok. Alterar` });
    expect(chosen).toHaveTextContent("Esforço: Ok");
    fireEvent.click(chosen);
    expect(screen.getByRole("radio", { name: "Ok" })).toBeChecked();
  });
});
