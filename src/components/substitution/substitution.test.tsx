import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkoutTracker } from "@/components/workout/workout-tracker";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const WORKOUT = buildWorkout("A", 1, [
  buildWorkoutExercise(1, { id: FIRST_ID, sets: 2, trackProgression: true }),
  buildWorkoutExercise(2, { id: "22222222-2222-4222-8222-222222222222", sets: 1 }),
]);
const PUSH_UP = { id: "e-push", slug: "push-up", name: "Flexão", coverMedia: null, media: [] };
const DIP = { id: "e-dip", slug: "chest-dip", name: "Paralelas", coverMedia: null, media: [] };
const SWAP_URL = `/api/workout-exercises/${FIRST_ID}/substitutions`;
const NAME = "Exercício falso 1";

type Reply = { status: number; body: unknown };

function mockApi(routes: Record<string, Reply>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const reply = routes[`${init?.method} ${url}`];
    if (!reply) throw new Error(`unexpected request ${init?.method} ${url}`);
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function bodyOf(fetchMock: ReturnType<typeof mockApi>, key: string): unknown {
  const call = fetchMock.mock.calls.find(([url, init]) => `${init?.method} ${url}` === key);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

const AI_REPLY: Reply = {
  status: 200,
  body: { success: true, data: { isAutomatic: false, suggestions: [{ exercise: PUSH_UP, reason: "Mesmo empurrar, sem aparelho" }, { exercise: DIP, reason: "Peito e tríceps" }] } },
};

function openSwap() {
  render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{ [FIRST_ID]: [20, 20] }} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Trocar exercício" })[0]);
  return screen.getByRole("region", { name: `Trocar ${NAME}` });
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("exercise substitution on the spot (step 3B.4)", () => {
  it("asks for options with the reason, shows them and swaps the exercise for today", async () => {
    const fetchMock = mockApi({ [`POST ${SWAP_URL}`]: AI_REPLY, "POST /api/workout-sessions": { status: 201, body: { success: true, data: { sessionId: "33333333-3333-4333-8333-333333333333" } } } });
    const panel = openSwap();
    fireEvent.click(within(panel).getByRole("radio", { name: "Aparelho ocupado" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Buscar substitutos" }));
    await waitFor(() => expect(screen.getByText("Mesmo empurrar, sem aparelho")).toBeInTheDocument());
    expect(bodyOf(fetchMock, `POST ${SWAP_URL}`)).toEqual({ reason: "equipment_busy", excludeSlugs: ["fake-exercise-1", "fake-exercise-2"] });
    expect(screen.queryByText(/Sugestões automáticas/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Usar Flexão" }));
    expect(screen.getByText(`No lugar de ${NAME} hoje`)).toBeInTheDocument();
    expect(screen.getByLabelText("Carga (kg) da série 1 de Flexão")).toHaveValue("");
    expect(screen.queryByRole("switch", { name: /Flexão/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Repetições da série 1 de Flexão"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Concluir série 1 de Flexão" }));
    expect(screen.queryByRole("button", { name: "Desfazer troca" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finalizar mesmo assim" }));
    await waitFor(() => expect(bodyOf(fetchMock, "POST /api/workout-sessions")).toBeDefined());
    expect(bodyOf(fetchMock, "POST /api/workout-sessions")).toMatchObject({
      sets: [{ workoutExerciseId: FIRST_ID, setNumber: 1, repsDone: 15 }],
      substitutions: [{ workoutExerciseId: FIRST_ID, exerciseSlug: "push-up", reason: "equipment_busy" }],
    });
  });

  it("flags automatic options and lets the user undo the swap", async () => {
    mockApi({ [`POST ${SWAP_URL}`]: { status: 200, body: { success: true, data: { isAutomatic: true, suggestions: [{ exercise: DIP, reason: null }] } } } });
    const panel = openSwap();
    fireEvent.click(within(panel).getByRole("button", { name: "Buscar substitutos" }));
    await waitFor(() => expect(screen.getByText(/Sugestões automáticas/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Usar Paralelas" }));
    fireEvent.click(screen.getByRole("button", { name: "Desfazer troca" }));
    expect(screen.queryByText(`No lugar de ${NAME} hoje`)).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Carga (kg) da série 1 de ${NAME}`)).toHaveValue("20");
  });

  it("shows the error, keeps the planned exercise and can be cancelled", async () => {
    mockApi({ [`POST ${SWAP_URL}`]: { status: 422, body: { success: false, error: "Nenhum exercício equivalente com o seu equipamento." } } });
    const panel = openSwap();
    fireEvent.click(within(panel).getByRole("button", { name: "Buscar substitutos" }));
    await waitFor(() => expect(within(panel).getByRole("alert")).toHaveTextContent("Nenhum exercício equivalente"));
    fireEvent.click(within(panel).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("region", { name: `Trocar ${NAME}` })).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Repetições da série 1 de ${NAME}`)).toBeInTheDocument();
  });

  it("does not offer a swap once a set of the exercise is checked", () => {
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    expect(screen.getAllByRole("button", { name: "Trocar exercício" })).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(`Repetições da série 1 de ${NAME}`), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("checkbox", { name: `Concluir série 1 de ${NAME}` }));
    expect(screen.getAllByRole("button", { name: "Trocar exercício" })).toHaveLength(1);
  });
});
