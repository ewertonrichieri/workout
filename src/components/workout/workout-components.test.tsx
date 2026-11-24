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

  it("links to the editor of the selected workout and shows the review notice only after a generation", () => {
    const { rerender } = render(<WorkoutPlanView overview={buildPlanOverview([WORKOUT_A, WORKOUT_B])} requestedLabel="B" />);
    expect(screen.getByRole("link", { name: "Editar treino B" })).toHaveAttribute("href", "/workout/edit?workout=B");
    expect(screen.queryByText(/revise e ajuste/)).not.toBeInTheDocument();
    rerender(<WorkoutPlanView overview={buildPlanOverview([WORKOUT_A, WORKOUT_B])} requestedLabel="B" showReviewNotice />);
    expect(screen.getByText("Plano gerado pela IA — revise e ajuste o que quiser.")).toBeInTheDocument();
  });

  it("explains an earned load increase on the card", () => {
    const tracked = buildWorkoutExercise(9, { trackProgression: true, sets: 2 });
    const overview = { ...buildPlanOverview([buildWorkout("A", 1, [tracked])]), suggestedLoads: { [tracked.id]: [21, 21] }, loadAdjustments: { [tracked.id]: { kind: "increase" as const, fromKg: 20, toKg: 21, reps: 12 } } };
    render(<WorkoutPlanView overview={overview} />);
    expect(screen.getByText("Você fez 12 repetições em todas as séries com 20 kg. Sugestão: 21 kg.")).toBeInTheDocument();
    expect(screen.queryByText("Carga sugerida da última sessão")).not.toBeInTheDocument();
  });

  it("explains a lower load and a load held by a set at the limit (step 3B.3)", () => {
    const lowered = buildWorkoutExercise(9, { trackProgression: true, sets: 2 });
    const held = buildWorkoutExercise(10, { trackProgression: true, sets: 2 });
    const overview = {
      ...buildPlanOverview([buildWorkout("A", 1, [lowered, held])]),
      suggestedLoads: { [lowered.id]: [28.5, 28.5], [held.id]: [20, 20] },
      loadAdjustments: {
        [lowered.id]: { kind: "decrease" as const, fromKg: 30, toKg: 28.5, maxEffortSets: 2, repsMin: 8 },
        [held.id]: { kind: "hold" as const, loadKg: 20 },
      },
    };
    render(<WorkoutPlanView overview={overview} />);
    expect(screen.getByText("2 séries no limite abaixo de 8 repetições com 30 kg. Sugestão: 28,5 kg.")).toBeInTheDocument();
    expect(screen.getByText('Você chegou ao máximo de repetições, mas marcou "no limite": a carga fica em 20 kg.')).toBeInTheDocument();
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
