import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import type { HistoryRepository } from "./history-repository";
import { createHistoryService, type ExerciseLookup } from "./history-service";

function setup() {
  const repository: HistoryRepository = {
    listFinishedSessions: vi.fn(async () => ({ items: [{ id: "s1", finishedAt: "2026-11-24T12:00:00.000Z", workoutLabel: "A", setCount: 12 }], total: 21 })),
    listExerciseSetLogs: vi.fn(async () => [{ sessionId: "s1", finishedAt: "2026-11-24T12:00:00.000Z", setNumber: 1, repsDone: 10, loadKg: 20 }]),
  };
  const exercises: ExerciseLookup = { findBySlug: vi.fn(async (slug: string) => (slug === "fake-press" ? { id: "e1", slug, name: "Supino falso" } : null)) };
  return { repository, exercises, service: createHistoryService(repository, exercises) };
}

describe("history service", () => {
  it("lists finished sessions with the local date and page info", async () => {
    const { service, repository } = setup();
    await expect(service.listHistory("user-1", "2")).resolves.toEqual({
      items: [{ id: "s1", date: "2026-11-24", workoutLabel: "A", setCount: 12 }],
      page: 2, pageSize: 20, total: 21, totalPages: 2,
    });
    expect(repository.listFinishedSessions).toHaveBeenCalledWith("user-1", { page: 2, pageSize: 20 });
  });

  it("defaults to the first page and rejects invalid pages", async () => {
    const { service, repository } = setup();
    await service.listHistory("user-1", undefined);
    expect(repository.listFinishedSessions).toHaveBeenCalledWith("user-1", { page: 1, pageSize: 20 });
    await expect(service.listHistory("user-1", "0")).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("returns the progression of an exercise of the catalog", async () => {
    const { service, repository } = setup();
    const progress = await service.getExerciseProgress("user-1", "fake-press");
    expect(repository.listExerciseSetLogs).toHaveBeenCalledWith("user-1", "e1");
    expect(progress).toEqual({
      exercise: { slug: "fake-press", name: "Supino falso" },
      entries: [{ sessionId: "s1", date: "2026-11-24", maxLoadKg: 20, repsAtMaxLoad: 10, setCount: 1 }],
    });
  });

  it("answers not found for unknown or invalid slugs", async () => {
    const { service } = setup();
    await expect(service.getExerciseProgress("user-1", "missing")).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getExerciseProgress("user-1", "Not A Slug")).rejects.toBeInstanceOf(NotFoundError);
  });
});
