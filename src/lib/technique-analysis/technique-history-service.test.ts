// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { createTechniqueHistoryService } from "./technique-history-service";
import type { TechniqueHistoryRepository } from "./technique-history-repository";

const ANALYSIS_ID = "00000000-0000-4000-8000-0000000000aa";
const ITEM = { id: ANALYSIS_ID, createdAt: "2026-11-26T01:30:00+00:00", overallScore: 6, repCount: 5, evaluatedRepCount: 5, mainTip: "Dica.", frequentIssues: [] };

function setup(deleted = true) {
  const repository: TechniqueHistoryRepository = {
    listAnalyses: vi.fn(async () => ({ items: [ITEM], total: 1 })),
    deleteAnalysis: vi.fn(async () => deleted),
  };
  return { repository, service: createTechniqueHistoryService({ repository }) };
}

describe("technique history service", () => {
  it("lists a supported exercise page by page (10 per page)", async () => {
    const { service, repository } = setup();
    // 01:30 UTC on the 26th is still the 25th in São Paulo (the app time zone).
    await expect(service.listHistory("user-1", { exercise: "barbell-back-squat", page: "2" })).resolves.toEqual({ items: [{ ...ITEM, date: "2026-11-25" }], total: 1, page: 2, pageSize: 10 });
    expect(repository.listAnalyses).toHaveBeenCalledWith("user-1", "barbell-back-squat", { page: 2, pageSize: 10 });
  });

  it("defaults to the first page and rejects invalid queries", async () => {
    const { service } = setup();
    await expect(service.listHistory("user-1", { exercise: "barbell-back-squat" })).resolves.toMatchObject({ page: 1 });
    await expect(service.listHistory("user-1", { exercise: "leg-press" })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.listHistory("user-1", { exercise: "barbell-back-squat", page: "0" })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.listHistory("user-1", {})).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("deletes an analysis of the user (decision D9) and answers 404 when it does not exist", async () => {
    await expect(setup().service.deleteAnalysis("user-1", ANALYSIS_ID)).resolves.toEqual({ id: ANALYSIS_ID });
    await expect(setup(false).service.deleteAnalysis("user-1", ANALYSIS_ID)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setup().service.deleteAnalysis("user-1", "not-an-id")).rejects.toBeInstanceOf(InvalidInputError);
  });
});
