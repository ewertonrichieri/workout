import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { createExerciseCatalogService } from "./exercise-catalog-service";
import type { ExerciseRepository } from "./exercise-repository";
import type { ExerciseDetail } from "./exercise-types";

const DETAIL: ExerciseDetail = {
  id: "6f1c2a52-6d0e-4f1a-9a0a-1b2c3d4e5f60",
  slug: "fake-press",
  name: "Supino falso",
  nameEn: "Fake Press",
  difficulty: null,
  instructions: null,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  media: [],
  coverMedia: null,
};

function createFakeRepository(overrides: Partial<ExerciseRepository> = {}): ExerciseRepository {
  return {
    search: vi.fn(async () => ({ items: [DETAIL], total: 41 })),
    findBySlug: vi.fn(async () => DETAIL),
    listMuscles: vi.fn(async () => [{ slug: "chest", name: "Peitoral" }]),
    listEquipment: vi.fn(async () => [{ slug: "dumbbell", name: "Halteres" }]),
    ...overrides,
  };
}

describe("exercise catalog service", () => {
  it("validates the search and returns pagination info", async () => {
    const repository = createFakeRepository();
    const page = await createExerciseCatalogService(repository).searchExercises({ q: "supino", page: "2", pageSize: "20" });
    expect(repository.search).toHaveBeenCalledWith({ query: "supino", page: 2, pageSize: 20 });
    expect(page).toMatchObject({ page: 2, pageSize: 20, total: 41, totalPages: 3, items: [DETAIL] });
  });

  it("rejects an invalid search without calling the repository", async () => {
    const repository = createFakeRepository();
    await expect(createExerciseCatalogService(repository).searchExercises({ page: "-1" })).rejects.toBeInstanceOf(InvalidInputError);
    expect(repository.search).not.toHaveBeenCalled();
  });

  it("returns an exercise by slug", async () => {
    await expect(createExerciseCatalogService(createFakeRepository()).getExercise("fake-press")).resolves.toEqual(DETAIL);
  });

  it("answers not found for unknown or malformed slugs", async () => {
    const repository = createFakeRepository({ findBySlug: vi.fn(async () => null) });
    const service = createExerciseCatalogService(repository);
    await expect(service.getExercise("missing")).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getExercise("../etc")).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findBySlug).toHaveBeenCalledTimes(1);
  });

  it("lists muscle and equipment filters", async () => {
    await expect(createExerciseCatalogService(createFakeRepository()).listFilters()).resolves.toEqual({
      muscles: [{ slug: "chest", name: "Peitoral" }],
      equipment: [{ slug: "dumbbell", name: "Halteres" }],
    });
  });
});
