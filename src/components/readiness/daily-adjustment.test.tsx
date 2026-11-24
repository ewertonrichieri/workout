import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkoutTracker } from "@/components/workout/workout-tracker";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { buildDraftStorageKey } from "@/lib/training/draft-storage";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import { createEmptyDraft } from "@/lib/training/set-log-draft";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";

const CHECKIN_ID = "44444444-4444-4444-8444-444444444444";
const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const THIRD_ID = "33333333-3333-4333-8333-333333333333";
const WORKOUT = buildWorkout("A", 1, [
  buildWorkoutExercise(1, { id: FIRST_ID, sets: 3, repsMin: 10, repsMax: 10 }),
  buildWorkoutExercise(2, { id: SECOND_ID, sets: 2 }),
  buildWorkoutExercise(3, { id: THIRD_ID, sets: 2 }),
]);
const GOBLET = { id: "55555555-5555-4555-8555-555555555555", slug: "goblet-squat", name: "Agachamento goblet", coverMedia: null, media: [] };
const PROPOSAL = {
  checkinId: CHECKIN_ID,
  summary: "Treino mais curto e sem carga no joelho.",
  estimatedMinutes: 30,
  changes: [
    { workoutExerciseId: FIRST_ID, changeType: "reduced", replacementSlug: null, sets: 2, repsMin: 10, repsMax: 10, reason: "Você dormiu mal", replacement: null },
    { workoutExerciseId: SECOND_ID, changeType: "removed", replacementSlug: null, sets: null, repsMin: null, repsMax: null, reason: "Falta de tempo", replacement: null },
    { workoutExerciseId: THIRD_ID, changeType: "replaced", replacementSlug: "goblet-squat", sets: 2, repsMin: 8, repsMax: 12, reason: "Poupa o joelho", replacement: GOBLET },
  ],
};
const ADJUSTMENT_URL = `/api/readiness-checkins/${CHECKIN_ID}/adjustment`;

type Reply = { status: number; body: unknown };

/** Answers by "METHOD url"; each key may hold a queue of replies (the last one repeats). */
function mockApi(routes: Record<string, Reply | Reply[]>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const route = routes[key];
    const reply = Array.isArray(route) ? (route.length > 1 ? route.shift() : route[0]) : route;
    if (!reply) throw new Error(`unexpected request ${key}`);
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function bodyOf(fetchMock: ReturnType<typeof mockApi>, key: string): unknown {
  const call = fetchMock.mock.calls.find(([url, init]) => `${init?.method} ${url}` === key);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

const CHECKIN_REPLY: Reply = { status: 201, body: { success: true, data: { checkinId: CHECKIN_ID, needsAdjustment: true, hasSeverePain: false } } };
const PROPOSAL_REPLY: Reply = { status: 200, body: { success: true, data: PROPOSAL } };
const SAVED_REPLY: Reply = { status: 200, body: { success: true, data: { changes: 3 } } };

async function reachReview() {
  render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{ [THIRD_ID]: [40, 40] }} sessionMinutes={60} />);
  fireEvent.click(screen.getByRole("button", { name: "Fazer check-in" }));
  fireEvent.click(screen.getByRole("radio", { name: "Mal" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar check-in" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Ajuste sugerido para hoje" })).toBeInTheDocument());
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("daily adjustment by AI (step 3B.2)", () => {
  it("shows the proposal with before and after, and applies it to today's workout only after accepting", async () => {
    const fetchMock = mockApi({ "POST /api/readiness-checkins": CHECKIN_REPLY, [`POST ${ADJUSTMENT_URL}`]: PROPOSAL_REPLY, [`PUT ${ADJUSTMENT_URL}`]: SAVED_REPLY });
    await reachReview();
    const changes = within(screen.getByRole("list", { name: "Mudanças sugeridas" }));
    expect(changes.getByText("No plano: 3 séries · 10 repetições")).toBeInTheDocument();
    expect(changes.getByText("Hoje: 2 séries · 10 repetições")).toBeInTheDocument();
    expect(changes.getByText("Hoje: fica fora do treino")).toBeInTheDocument();
    expect(changes.getByText("Hoje: Agachamento goblet, 2 séries · 8 a 12 repetições")).toBeInTheDocument();
    expect(screen.getByText("Duração aproximada: 30 min")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: /^Concluir série/ })).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "Usar treino ajustado" }));
    await waitFor(() => expect(screen.getByText(/Treino de hoje ajustado pela IA/)).toBeInTheDocument());
    const saved = PROPOSAL.changes.map((change) => {
      const copy: Record<string, unknown> = { ...change };
      delete copy.replacement;
      return copy;
    });
    expect(bodyOf(fetchMock, `PUT ${ADJUSTMENT_URL}`)).toEqual({ changes: saved });
    expect(screen.getAllByRole("checkbox", { name: /^Concluir série/ })).toHaveLength(4);
    expect(screen.queryByText("Exercício falso 2")).not.toBeInTheDocument();
    expect(screen.getByText("Ajustado hoje: Você dormiu mal")).toBeInTheDocument();
    expect(screen.getByText("No lugar de Exercício falso 3 hoje: Poupa o joelho")).toBeInTheDocument();
    expect(screen.getByLabelText("Carga (kg) da série 1 de Agachamento goblet")).toHaveValue("");
    expect(screen.queryByRole("switch", { name: /Agachamento goblet/ })).not.toBeInTheDocument();
  });

  it("keeps the original workout without saving anything", async () => {
    const fetchMock = mockApi({ "POST /api/readiness-checkins": CHECKIN_REPLY, [`POST ${ADJUSTMENT_URL}`]: PROPOSAL_REPLY });
    await reachReview();
    fireEvent.click(screen.getByRole("button", { name: "Manter treino original" }));
    expect(screen.getByText("Você manteve o treino original.")).toBeInTheDocument();
    expect(screen.getByText("Exercício falso 2")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("explains an AI failure, keeps the normal workout and can try again", async () => {
    mockApi({
      "POST /api/readiness-checkins": CHECKIN_REPLY,
      [`POST ${ADJUSTMENT_URL}`]: [{ status: 502, body: { success: false, error: "A IA demorou demais para responder." } }, PROPOSAL_REPLY],
    });
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Fazer check-in" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar check-in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("A IA demorou demais para responder."));
    expect(screen.getByText("Não foi possível ajustar o treino agora. Você pode treinar com o plano normal.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ajuste sugerido para hoje" })).toBeInTheDocument());
  });

  it("undoes an accepted adjustment until a set is checked", async () => {
    const fetchMock = mockApi({ "POST /api/readiness-checkins": CHECKIN_REPLY, [`POST ${ADJUSTMENT_URL}`]: PROPOSAL_REPLY, [`PUT ${ADJUSTMENT_URL}`]: SAVED_REPLY });
    await reachReview();
    fireEvent.click(screen.getByRole("button", { name: "Usar treino ajustado" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Voltar ao treino original" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao treino original" }));
    await waitFor(() => expect(screen.getByText("Você manteve o treino original.")).toBeInTheDocument());
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(puts[1][1]?.body))).toEqual({ changes: [] });
    expect(screen.getAllByRole("checkbox", { name: /^Concluir série/ })).toHaveLength(7);
  });

  it("hides undo after a checked set and finishes with today's sets", async () => {
    const fetchMock = mockApi({
      "POST /api/readiness-checkins": CHECKIN_REPLY,
      [`POST ${ADJUSTMENT_URL}`]: PROPOSAL_REPLY,
      [`PUT ${ADJUSTMENT_URL}`]: SAVED_REPLY,
      "POST /api/workout-sessions": { status: 201, body: { success: true, data: { sessionId: "66666666-6666-4666-8666-666666666666" } } },
    });
    await reachReview();
    fireEvent.click(screen.getByRole("button", { name: "Usar treino ajustado" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Voltar ao treino original" })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Repetições da série 1 de Agachamento goblet"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Concluir série 1 de Agachamento goblet" }));
    expect(screen.queryByRole("button", { name: "Voltar ao treino original" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar treino" }));
    fireEvent.click(await screen.findByRole("button", { name: "Finalizar mesmo assim" }));
    await waitFor(() => expect(bodyOf(fetchMock, "POST /api/workout-sessions")).toBeDefined());
    expect(bodyOf(fetchMock, "POST /api/workout-sessions")).toMatchObject({
      readinessCheckinId: CHECKIN_ID,
      sets: [{ workoutExerciseId: THIRD_ID, setNumber: 1, repsDone: 10, loadKg: null }],
    });
  });

  it("restores an accepted adjustment after reloading, without calling the AI again", () => {
    const fetchMock = mockApi({});
    const readiness = { status: "done", checkinId: CHECKIN_ID, needsAdjustment: true, hasSeverePain: false, adjustment: { status: "accepted", proposal: PROPOSAL } };
    const date = toDateInTimeZone(new Date(), APP_TIME_ZONE);
    window.localStorage.setItem(buildDraftStorageKey(WORKOUT.id, date), JSON.stringify({ ...createEmptyDraft(WORKOUT, date), readiness }));
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    expect(screen.getByText("No lugar de Exercício falso 3 hoje: Poupa o joelho")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: /^Concluir série/ })).toHaveLength(4);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
