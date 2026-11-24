import { APP_ROUTES } from "@/lib/constants/routes";

/** Filters kept in the URL of the exercise list. */
export interface ExerciseListFilters {
  query?: string;
  muscle?: string;
  equipment?: string;
}

const FIRST_PAGE = 1;

export function buildExerciseSearchHref(filters: ExerciseListFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.muscle) params.set("muscle", filters.muscle);
  if (filters.equipment) params.set("equipment", filters.equipment);
  if (page > FIRST_PAGE) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `${APP_ROUTES.exercises}?${queryString}` : APP_ROUTES.exercises;
}

export function buildExerciseDetailHref(slug: string): string {
  return `${APP_ROUTES.exercises}/${slug}`;
}
