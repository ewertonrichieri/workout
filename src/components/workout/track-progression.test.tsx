import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { WorkoutTracker } from "./workout-tracker";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const TRACKED = buildWorkoutExercise(1, { id: "11111111-1111-4111-8111-111111111111", sets: 2, trackProgression: true });
const WORKOUT = buildWorkout("A", 1, [TRACKED]);
const NAME = "Exercício falso 1";

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
  window.localStorage.clear();
});

describe("Salvar carga para progredir", () => {
  it("prefills the suggested load of the latest session and tells where it comes from", async () => {
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{ [TRACKED.id]: [20, 22.5] }} />);
    await waitFor(() => expect(screen.getByLabelText(`Carga (kg) da série 2 de ${NAME}`)).toHaveValue("22,5"));
    expect(screen.getByText("Carga sugerida da última sessão")).toBeInTheDocument();
  });

  it("saves the toggle and refreshes the server data", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { trackProgression: false } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    const toggle = screen.getByRole("switch", { name: `Salvar carga para progredir em ${NAME}` });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/workout-exercises/${TRACKED.id}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ trackProgression: false });
  });

  it("reverts the toggle and explains when saving fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    render(<WorkoutTracker workout={WORKOUT} suggestedLoads={{}} />);
    const toggle = screen.getByRole("switch", { name: `Salvar carga para progredir em ${NAME}` });
    fireEvent.click(toggle);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar a preferência.");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
