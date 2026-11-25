// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseTechniqueAnalysisRepository, type TechniqueAnalysisRecord } from "./technique-analysis-repository";
import { buildSquatRep } from "./test-fixtures";

const ANALYSIS_ID = "00000000-0000-4000-8000-0000000000aa";
const RECORD: TechniqueAnalysisRecord = {
  exerciseId: "00000000-0000-4000-8000-0000000000e1",
  cameraView: "side",
  overallScore: 7,
  mainTip: "Desça um pouco mais.",
  reps: [
    { rep: buildSquatRep(1), score: 9, issues: [] },
    { rep: buildSquatRep(2, { isEvaluated: false }), score: null, issues: [] },
    { rep: buildSquatRep(3, { minThighAngle: 20 }), score: 5, issues: [{ issue: "shallow_depth", severity: "error" }] },
  ],
  strengths: ["Boa profundidade."],
  corrections: [{ issue: "shallow_depth", repNumbers: [3], text: "Desça mais." }],
};

function clientReturning(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => result);
  return { rpc, client: { rpc } as unknown as SupabaseClient };
}

describe("technique analysis repository", () => {
  it("saves the analysis, its reps, issues and feedback in one database function", async () => {
    const { client, rpc } = clientReturning({ data: ANALYSIS_ID, error: null });
    await expect(createSupabaseTechniqueAnalysisRepository(client).saveAnalysis(RECORD)).resolves.toBe(ANALYSIS_ID);
    expect(rpc).toHaveBeenCalledWith("save_technique_analysis", {
      p_exercise_id: RECORD.exerciseId,
      p_camera_view: "side",
      p_overall_score: 7,
      p_main_tip: "Desça um pouco mais.",
      p_reps: [
        expect.objectContaining({ rep_number: 1, score: 9, is_evaluated: true, duration_ms: 3000, descent_ms: 1500, min_thigh_angle: -5, issues: [] }),
        expect.objectContaining({ rep_number: 2, score: null, is_evaluated: false }),
        expect.objectContaining({ rep_number: 3, min_thigh_angle: 20, issues: [{ issue: "shallow_depth", severity: "error" }] }),
      ],
      p_feedback: [
        { kind: "strength", position: 1, issue: null, text: "Boa profundidade." },
        { kind: "correction", position: 1, issue: "shallow_depth", text: "Desça mais." },
      ],
    });
  });

  it("fails with a repository error when the database refuses", async () => {
    const { client } = clientReturning({ data: null, error: { message: "denied" } });
    await expect(createSupabaseTechniqueAnalysisRepository(client).saveAnalysis(RECORD)).rejects.toBeInstanceOf(RepositoryError);
  });
});
