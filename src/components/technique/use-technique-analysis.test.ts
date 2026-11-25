import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSquatRep } from "@/lib/technique-analysis/test-fixtures";
import { useTechniqueAnalysis } from "./use-technique-analysis";

const RESULT = {
  id: "00000000-0000-4000-8000-0000000000aa", overallScore: 7, mainTip: "Desça mais.", strengths: [], corrections: [],
  reps: [{ repNumber: 1, score: 7, isEvaluated: true, issues: [] }], hasLimitations: false,
};

function mockFetch(...responses: Array<{ status: number; body: unknown }>) {
  const fetchMock = vi.fn();
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(response.body), { status: response.status })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useTechniqueAnalysis", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the numbers of each rep, once, and returns the analysis", async () => {
    const fetchMock = mockFetch({ status: 201, body: { success: true, data: RESULT } });
    const reps = [buildSquatRep(1)];
    const { result, rerender } = renderHook(() => useTechniqueAnalysis({ reps, exerciseSlug: "barbell-back-squat", cameraView: "side", isEnabled: true }));
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", result: RESULT }));
    rerender();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/technique-analyses");
    expect(JSON.parse(String(init.body))).toEqual({
      exerciseSlug: "barbell-back-squat", cameraView: "side",
      reps: [{ repNumber: 1, durationMs: 3000, descentMs: 1500, frameCount: 90, seenFrameCount: 90, metrics: { minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30, maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0 } }],
    });
  });

  it("shows the server message (e.g. the AI limit) and retries on demand", async () => {
    mockFetch({ status: 429, body: { success: false, error: "Você chegou ao limite." } }, { status: 201, body: { success: true, data: RESULT } });
    const { result } = renderHook(() => useTechniqueAnalysis({ reps: [buildSquatRep(1)], exerciseSlug: "barbell-back-squat", cameraView: "side", isEnabled: true }));
    await waitFor(() => expect(result.current.state).toEqual({ status: "error", message: "Você chegou ao limite." }));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
  });

  it("does not call the AI when the set must be recorded again", () => {
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useTechniqueAnalysis({ reps: [], exerciseSlug: "barbell-back-squat", cameraView: "side", isEnabled: false }));
    expect(result.current.state.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
