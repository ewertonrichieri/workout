import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseTechniqueHistoryRepository } from "./technique-history-repository";

const ANALYSIS_ID = "00000000-0000-4000-8000-0000000000aa";

function createFakeClient(result: { data: unknown; error: unknown; count?: number | null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "order", "delete"]) builder[method] = vi.fn(() => builder);
  builder.range = vi.fn(async () => result);
  const thenable = { ...builder, then: (resolve: (value: unknown) => void) => resolve(result) };
  builder.select = vi.fn(() => Object.assign(builder, { then: thenable.then }));
  const client = { from: vi.fn(() => builder) };
  return { client: client as unknown as SupabaseClient, builder };
}

const ROW = {
  id: ANALYSIS_ID, created_at: "2026-11-25T12:00:00+00:00", overall_score: 6, rep_count: 5, evaluated_rep_count: 4, main_tip: "Desça mais.",
  technique_reps: [
    { technique_rep_issues: [{ issue: "shallow_depth", severity: "error" }, { issue: "knee_forward", severity: "info" }] },
    { technique_rep_issues: [{ issue: "shallow_depth", severity: "error" }, { issue: "fast_descent", severity: "warning" }] },
    { technique_rep_issues: [] },
  ],
};

describe("technique history repository (step 5.5)", () => {
  it("lists the user's analyses of one exercise, newest first, with the most frequent issues to fix", async () => {
    const { client, builder } = createFakeClient({ data: [ROW], error: null, count: 1 });
    const page = await createSupabaseTechniqueHistoryRepository(client).listAnalyses("user-1", "barbell-back-squat", { page: 2, pageSize: 10 });
    expect(page).toEqual({
      items: [{
        id: ANALYSIS_ID, createdAt: "2026-11-25T12:00:00+00:00", overallScore: 6, repCount: 5, evaluatedRepCount: 4, mainTip: "Desça mais.",
        frequentIssues: [{ issue: "shallow_depth", repCount: 2 }, { issue: "fast_descent", repCount: 1 }],
      }],
      total: 1,
    });
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.eq).toHaveBeenCalledWith("exercises.slug", "barbell-back-squat");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(10, 19);
  });

  it("fails with a repository error on unexpected rows", async () => {
    const { client } = createFakeClient({ data: [{ id: "x" }], error: null, count: 1 });
    await expect(createSupabaseTechniqueHistoryRepository(client).listAnalyses("user-1", "barbell-back-squat", { page: 1, pageSize: 10 })).rejects.toBeInstanceOf(RepositoryError);
  });

  it("deletes one analysis of the user and says whether it existed", async () => {
    const found = createFakeClient({ data: [{ id: ANALYSIS_ID }], error: null });
    await expect(createSupabaseTechniqueHistoryRepository(found.client).deleteAnalysis("user-1", ANALYSIS_ID)).resolves.toBe(true);
    expect(found.builder.eq).toHaveBeenCalledWith("id", ANALYSIS_ID);
    expect(found.builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    const missing = createFakeClient({ data: [], error: null });
    await expect(createSupabaseTechniqueHistoryRepository(missing.client).deleteAnalysis("user-1", ANALYSIS_ID)).resolves.toBe(false);
  });
});
