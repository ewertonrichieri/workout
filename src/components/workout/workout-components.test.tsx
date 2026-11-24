import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutPlanView } from "./workout-plan-view";

const WORKOUT_A = buildWorkout("A", 1, [
  buildWorkoutExercise(1, { category: "Neuromuscular", sets: 3, repsMin: 10, repsMax: 10, restSeconds: 90, notes: "Cadência lenta" }),
  buildWorkoutExercise(2, { category: "Força", restSeconds: null }),
]);
const WORKOUT_B = buildWorkout("B", 2, [buildWorkoutExercise(3)]);

describe("WorkoutPlanView", () => {
  it("shows tabs only when the plan has more than one workout", () => {
    render(<WorkoutPlanView overview={buildPlanOverview([WORKOUT_A, WORKOUT_B])} requestedLabel="B" />);
    const tabs = screen.getByRole("navigation", { name: "Treinos do plano" });
    expect(within(tabs).getByRole("link", { name: "Treino B" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Treino A" })).toHaveAttribute("href", "/workout?workout=A");
    expect(screen.getByRole("link", { name: "Exercício falso 3" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Exercício falso 1" })).not.toBeInTheDocument();
  });

  it("uses the label as title for a single workout plan", () => {
    render(<WorkoutPlanView overview={buildPlanOverview([buildWorkout("Full body", 1, [buildWorkoutExercise(1)])])} />);
    expect(screen.queryByRole("navigation", { name: "Treinos do plano" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Full body" })).toBeInTheDocument();
  });

  it("shows the validity with an accessible progress bar", () => {
    render(<WorkoutPlanView overview={buildPlanOverview([WORKOUT_A])} />);
    expect(screen.getByText("Válido até 13/12/2026 · 21 dias restantes")).toBeInTheDocument();
    const progressBar = screen.getByRole("progressbar", { name: "Validade do plano" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    expect(progressBar).toHaveAttribute("aria-valuetext", "50% do período decorrido");
  });

  it("groups exercise cards by category with prescription and link to the detail", () => {
    render(<WorkoutPlanView overview={buildPlanOverview([WORKOUT_A])} />);
    const group = screen.getByRole("region", { name: "Neuromuscular" });
    expect(within(group).getByRole("link", { name: "Exercício falso 1" })).toHaveAttribute("href", "/exercises/fake-exercise-1");
    expect(within(group).getByText("3 séries · 10 repetições")).toBeInTheDocument();
    expect(within(group).getByText("Descanso: 1 min 30 s")).toBeInTheDocument();
    expect(within(group).getByText("Cadência lenta")).toBeInTheDocument();
    const strength = screen.getByRole("region", { name: "Força" });
    expect(within(strength).queryByText(/Descanso/)).not.toBeInTheDocument();
  });

  it("shows an empty state for a workout without exercises", () => {
    render(<WorkoutPlanView overview={buildPlanOverview([buildWorkout("A", 1)])} />);
    expect(screen.getByRole("heading", { name: "Treino sem exercícios" })).toBeInTheDocument();
  });
});

describe("exercise demonstration", () => {
  it("mounts the media player only after the card disclosure is opened", () => {
    const media = [{ mediaType: "gif" as const, url: "https://cdn.example.test/a.gif", thumbnailUrl: null, source: "exercise-library", license: "unverified" }];
    const workout = buildWorkout("A", 1, [buildWorkoutExercise(1, { exercise: { ...buildWorkoutExercise(1).exercise, media } })]);
    render(<WorkoutPlanView overview={buildPlanOverview([workout])} />);
    const label = "Demonstração de Exercício falso 1";
    expect(screen.queryByRole("img", { name: label })).not.toBeInTheDocument();
    const details = screen.getByText("Ver demonstração").closest("details");
    if (!details) throw new Error("disclosure not rendered");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(screen.getByRole("img", { name: label })).toHaveAttribute("src", "https://cdn.example.test/a.gif");
  });
});
