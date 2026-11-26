import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutEditor } from "./workout-editor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const ID_1 = "11111111-1111-4111-8111-111111111111";
const ID_2 = "22222222-2222-4222-8222-222222222222";
const WORKOUT = buildWorkout("A", 1, [buildWorkoutExercise(1, { id: ID_1 }), buildWorkoutExercise(2, { id: ID_2 })]);
WORKOUT.id = "33333333-3333-4333-8333-333333333333";
const NAME_1 = "Exercício falso 1";
const NAME_2 = "Exercício falso 2";

type FetchHandler = (url: string, init?: RequestInit) => Response;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mockFetch(handler: FetchHandler) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function savedBody(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
  return call ? JSON.parse(String(call[1]?.body)) : null;
}

/** Rows start closed (spec 015). */
function openRow(name: string) {
  fireEvent.click(screen.getByRole("button", { name: `Editar ${name}` }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("WorkoutEditor", () => {
  it("saves edited fields and the new order, then returns to the workout", async () => {
    const fetchMock = mockFetch(() => json(200, { success: true, data: { workoutId: WORKOUT.id } }));
    render(<WorkoutEditor workout={WORKOUT} />);
    openRow(NAME_1);
    openRow(NAME_2);
    fireEvent.change(screen.getByLabelText(`Séries de ${NAME_1}`), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(`Observação de ${NAME_1}`), { target: { value: "Desça devagar" } });
    fireEvent.click(screen.getByRole("button", { name: `Subir ${NAME_2}` }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/workout?workout=A"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/workouts/${WORKOUT.id}/exercises`);
    expect(init?.method).toBe("PUT");
    const body = savedBody(fetchMock);
    expect(body.exercises.map((item: { id: string }) => item.id)).toEqual([ID_2, ID_1]);
    expect(body.exercises[1]).toMatchObject({ sets: 5, notes: "Desça devagar" });
  });

  it("removes an exercise and can discard every change", () => {
    mockFetch(() => json(200, {}));
    render(<WorkoutEditor workout={WORKOUT} />);
    openRow(NAME_1);
    fireEvent.click(screen.getByRole("button", { name: `Remover ${NAME_1}` }));
    expect(screen.queryByText(NAME_1)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descartar alterações" }));
    expect(screen.getByText(NAME_1)).toBeInTheDocument();
  });

  it("shows field errors and sends nothing while a value is invalid", () => {
    const fetchMock = mockFetch(() => json(200, {}));
    render(<WorkoutEditor workout={WORKOUT} />);
    openRow(NAME_1);
    fireEvent.change(screen.getByLabelText(`Séries de ${NAME_1}`), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(screen.getByLabelText(`Séries de ${NAME_1}`)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Use um número inteiro de 1 a 10.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Confira os campos destacados.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds an exercise found in the catalog, leaving out the ones already in the workout", async () => {
    const fetchMock = mockFetch((url) => {
      if (url.startsWith("/api/exercises")) {
        return json(200, { success: true, data: { items: [{ slug: "fake-exercise-1", name: NAME_1 }, { slug: "goblet-squat", name: "Agachamento goblet" }] } });
      }
      return json(200, { success: true, data: { workoutId: WORKOUT.id } });
    });
    render(<WorkoutEditor workout={WORKOUT} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar exercício" }));
    fireEvent.change(screen.getByLabelText("Buscar exercício no catálogo"), { target: { value: "agach" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    const results = await screen.findByRole("list", { name: "Adicionar exercício" });
    expect(within(results).queryByRole("button", { name: `Escolher ${NAME_1}` })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain("q=agach");
    fireEvent.click(within(results).getByRole("button", { name: "Escolher Agachamento goblet" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(savedBody(fetchMock).exercises[2]).toMatchObject({ id: null, exerciseSlug: "goblet-squat", sets: 3, repsMin: 10, repsMax: 10 });
  });

  it("keeps the changes on screen when saving fails", async () => {
    mockFetch(() => json(500, { success: false, error: "Ocorreu um erro inesperado. Tente novamente." }));
    render(<WorkoutEditor workout={WORKOUT} />);
    openRow(NAME_1);
    fireEvent.change(screen.getByLabelText(`Séries de ${NAME_1}`), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ocorreu um erro inesperado."));
    expect(screen.getByLabelText(`Séries de ${NAME_1}`)).toHaveValue(4);
    expect(push).not.toHaveBeenCalled();
  });

  it("swaps an exercise for another one from the catalog, keeping the prescription", async () => {
    const fetchMock = mockFetch((url) =>
      url.startsWith("/api/exercises")
        ? json(200, { success: true, data: { items: [{ slug: "goblet-squat", name: "Agachamento goblet" }] } })
        : json(200, { success: true, data: { workoutId: WORKOUT.id } }),
    );
    render(<WorkoutEditor workout={WORKOUT} />);
    openRow(NAME_1);
    fireEvent.click(screen.getByRole("button", { name: `Trocar ${NAME_1}` }));
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Escolher Agachamento goblet" }));
    expect(screen.queryByText(NAME_1)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(savedBody(fetchMock).exercises[0]).toMatchObject({ id: ID_1, exerciseSlug: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12 });
  });
});
