import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { buildDraftStorageKey } from "@/lib/training/draft-storage";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import { createEmptyDraft, updateSetEntry } from "@/lib/training/set-log-draft";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutTracker } from "./workout-tracker";

const WORKOUT = buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 2 }), buildWorkoutExercise(2, { sets: 1 })]);
const NAME = "Exercício falso 2";

function today(): string {
  return toDateInTimeZone(new Date(), APP_TIME_ZONE);
}

afterEach(() => window.localStorage.clear());

describe("WorkoutTracker", () => {
  it("renders one labelled row per prescribed set", () => {
    render(<WorkoutTracker workout={WORKOUT} />);
    expect(screen.getByLabelText("Repetições da série 2 de Exercício falso 1")).toHaveAttribute("placeholder", "8 a 12");
    expect(screen.getByLabelText("Carga (kg) da série 1 de Exercício falso 1")).toHaveAttribute("inputmode", "decimal");
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("enables the check only with reps and marks the exercise as completed", () => {
    render(<WorkoutTracker workout={WORKOUT} />);
    const check = screen.getByRole("checkbox", { name: `Concluir série 1 de ${NAME}` });
    expect(check).toBeDisabled();
    fireEvent.change(screen.getByLabelText(`Repetições da série 1 de ${NAME}`), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(`Carga (kg) da série 1 de ${NAME}`), { target: { value: "12,5" } });
    fireEvent.click(check);
    expect(check).toBeChecked();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getByText("1 de 2 exercícios concluídos")).toBeInTheDocument();
  });

  it("shows a field error after leaving an invalid load", () => {
    render(<WorkoutTracker workout={WORKOUT} />);
    const load = screen.getByLabelText(`Carga (kg) da série 1 de ${NAME}`);
    fireEvent.change(load, { target: { value: "1,234" } });
    fireEvent.blur(load);
    expect(load).toHaveAttribute("aria-invalid", "true");
    expect(load).toHaveAccessibleDescription("Use um número de 0 a 9999,99 kg, com até 2 casas decimais.");
  });

  it("saves the draft on the device and restores it after reload", async () => {
    const stored = updateSetEntry(createEmptyDraft(WORKOUT, today()), "workout-exercise-1", 1, { repsDone: "9", load: "20" });
    window.localStorage.setItem(buildDraftStorageKey(WORKOUT.id, today()), JSON.stringify(stored));
    render(<WorkoutTracker workout={WORKOUT} />);
    const reps = screen.getByLabelText("Repetições da série 2 de Exercício falso 1");
    await waitFor(() => expect(reps).toHaveValue("9"));
    fireEvent.change(reps, { target: { value: "11" } });
    const saved = JSON.parse(window.localStorage.getItem(buildDraftStorageKey(WORKOUT.id, today())) ?? "null");
    expect(saved.entries["workout-exercise-1"][1]).toEqual({ repsDone: "11", load: "20", isDone: false });
  });
});
