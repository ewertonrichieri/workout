import { SLUG_PATTERN } from "@/lib/constants/catalog";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { ExerciseRepository } from "./exercise-repository";
import { exerciseSearchSchema } from "./exercise-search-schema";
import type { ExerciseDetail, ExerciseFilters, ExerciseSearchPage } from "./exercise-types";

export interface ExerciseCatalogService {
  searchExercises(rawParams: unknown): Promise<ExerciseSearchPage>;
  getExercise(rawSlug: unknown): Promise<ExerciseDetail>;
  listFilters(): Promise<ExerciseFilters>;
}

function buildNotFoundError(): NotFoundError {
  return new NotFoundError(translate("errors.notFound", { resource: translate("catalog.exerciseResource") }));
}

export function createExerciseCatalogService(repository: ExerciseRepository): ExerciseCatalogService {
  return {
    async searchExercises(rawParams) {
      const parsed = exerciseSearchSchema.safeParse(rawParams);
      if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
      const criteria = parsed.data;
      const { items, total } = await repository.search(criteria);
      return { items, total, page: criteria.page, pageSize: criteria.pageSize, totalPages: Math.ceil(total / criteria.pageSize) };
    },
    async getExercise(rawSlug) {
      if (typeof rawSlug !== "string" || !SLUG_PATTERN.test(rawSlug)) throw buildNotFoundError();
      const exercise = await repository.findBySlug(rawSlug);
      if (!exercise) throw buildNotFoundError();
      return exercise;
    },
    async listFilters() {
      const [muscles, equipment] = await Promise.all([repository.listMuscles(), repository.listEquipment()]);
      return { muscles, equipment };
    },
  };
}
