import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { buildDraftStorageKey } from "@/lib/training/draft-storage";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutTracker } from "./workout-tracker";

const WORKOUT = buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 2 })]);
const NAME = "Exercício falso 1";

function storageKey(): string {
  return buildDraftStorageKey(WORKOUT.id, toDateInTimeZone(new Date(), APP_TIME_ZONE));
}

function completeFirstSet() {
  fireEvent.change(screen.getByLabelText(`Repetições da série 1 de ${NAME}`), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("checkbox", { name: `Concluir série 1 de ${NAME}` }));
}

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("Finalizar treino", () => {
  it("warns and sends nothing without checked sets", () => {
    const fetchMock = mockFetch(201, {});
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Marque pelo menos uma série antes de finalizar o treino.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for confirmation with unchecked sets, then saves and clears the draft", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { sessionId: "33333333-3333-4333-8333-333333333333" } });
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    completeFirstSet();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    expect(screen.getByText("Ainda há séries sem check. Elas não serão salvas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar mesmo assim" }));
    await screen.findByText("Treino finalizado e salvo.");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/workout-sessions");
    expect(JSON.parse(String(init.body)).sets).toEqual([{ workoutExerciseId: "workout-exercise-1", setNumber: 1, repsDone: 10, loadKg: null }]);
    expect(screen.getByLabelText(`Repetições da série 1 de ${NAME}`)).toHaveValue("");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(storageKey()) ?? "null")?.entries["workout-exercise-1"][0].repsDone).toBe(""));
  });

  it("keeps the draft and shows the server message when saving fails", async () => {
    mockFetch(422, { success: false, error: "Algumas séries não correspondem ao treino atual. Recarregue a página e tente de novo." });
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    completeFirstSet();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar mesmo assim" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Algumas séries não correspondem");
    expect(screen.getByLabelText(`Repetições da série 1 de ${NAME}`)).toHaveValue("10");
  });

  it("shows a friendly message when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    render(<WorkoutTracker workout={buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 1 })])} suggestedLoads={{}} />);
    completeFirstSet();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar o treino.");
  });
});
