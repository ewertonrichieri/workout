import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkoutTracker } from "@/components/workout/workout-tracker";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";

const WORKOUT = buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 1 })]);
const CHECKIN_ID = "44444444-4444-4444-8444-444444444444";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof mockFetch>): unknown {
  const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(String(call[1].body));
}

function openForm() {
  render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} sessionMinutes={50} />);
  fireEvent.click(screen.getByRole("button", { name: "Fazer check-in" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("pre-workout check-in (step 3B.1)", () => {
  it("offers the check-in before the workout and lets the user skip it", () => {
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    expect(screen.getByRole("heading", { name: "Como você está hoje?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pular check-in" }));
    expect(screen.queryByRole("heading", { name: "Como você está hoje?" })).not.toBeInTheDocument();
  });

  it("hides the prompt once the user starts logging without a check-in", () => {
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    fireEvent.change(screen.getByLabelText("Repetições da série 1 de Exercício falso 1"), { target: { value: "10" } });
    expect(screen.queryByRole("button", { name: "Fazer check-in" })).not.toBeInTheDocument();
  });

  it("starts with a normal day and the assessment time, then saves and shows the result", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { checkinId: CHECKIN_ID, needsAdjustment: false, hasSeverePain: false } });
    openForm();
    expect(screen.getByRole("radio", { name: "Ok" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "50 min" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Salvar check-in" }));
    await waitFor(() => expect(screen.getByText("Tudo certo para treinar como planejado. Bom treino!")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/readiness-checkins", expect.objectContaining({ method: "POST" }));
    expect(sentBody(fetchMock)).toEqual({ workoutId: WORKOUT.id, sleepQuality: "ok", energyLevel: "normal", availableMinutes: 50, pains: [] });
  });

  it("sends pains with their intensity and reinforces the health notice for a severe pain", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { checkinId: CHECKIN_ID, needsAdjustment: true, hasSeverePain: true } });
    openForm();
    fireEvent.click(screen.getByRole("radio", { name: "Mal" }));
    fireEvent.click(screen.getByRole("radio", { name: "30 min" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Joelhos" }));
    const intensity = screen.getByRole("radiogroup", { name: "Intensidade em Joelhos" });
    expect(intensity).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Forte" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar check-in" }));
    await waitFor(() => expect(screen.getByText(/indica um dia mais leve/)).toBeInTheDocument());
    expect(screen.getByText(/Você marcou dor forte/)).toBeInTheDocument();
    expect(sentBody(fetchMock)).toMatchObject({ sleepQuality: "poor", availableMinutes: 30, pains: [{ bodyRegion: "knees", intensity: "severe" }] });
  });

  it("keeps the answers after a failure and still lets the user train without a check-in", async () => {
    mockFetch(500, { success: false, error: "Erro interno." });
    openForm();
    fireEvent.click(screen.getByRole("radio", { name: "Bem" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar check-in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Erro interno."));
    expect(screen.getByRole("radio", { name: "Bem" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Treinar sem check-in" }));
    expect(screen.queryByRole("button", { name: "Salvar check-in" })).not.toBeInTheDocument();
  });

  it("sends the check-in id when finishing the workout", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { checkinId: CHECKIN_ID, needsAdjustment: false, hasSeverePain: false } });
    openForm();
    fireEvent.click(screen.getByRole("button", { name: "Salvar check-in" }));
    await waitFor(() => expect(screen.getByText("Check-in feito")).toBeInTheDocument());
    fetchMock.mockClear();
    fireEvent.change(screen.getByLabelText("Repetições da série 1 de Exercício falso 1"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Concluir série 1 de Exercício falso 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentBody(fetchMock)).toMatchObject({ readinessCheckinId: CHECKIN_ID });
  });
});
