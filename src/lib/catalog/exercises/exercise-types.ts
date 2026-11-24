import type { EXERCISE_DIFFICULTIES } from "../catalog-sources";

export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];
export type ExerciseMediaType = "video" | "gif" | "image" | "youtube";

/** Muscle or equipment as shown to the user. */
export interface CatalogTerm {
  slug: string;
  name: string;
}

export interface ExerciseMediaItem {
  mediaType: ExerciseMediaType;
  url: string;
  thumbnailUrl: string | null;
  source: string;
  license: string;
}

export interface ExerciseDetail {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  difficulty: ExerciseDifficulty | null;
  /** pt-BR instructions; `null` while not translated (CAT-006). */
  instructions: string | null;
  primaryMuscles: CatalogTerm[];
  secondaryMuscles: CatalogTerm[];
  equipment: CatalogTerm[];
  /** Enabled media, best first. */
  media: ExerciseMediaItem[];
  coverMedia: ExerciseMediaItem | null;
}

/** Same shape as the detail; lists simply ignore the extra fields. */
export type ExerciseSummary = ExerciseDetail;

export interface ExerciseSearchPage {
  items: ExerciseSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ExerciseFilters {
  muscles: CatalogTerm[];
  equipment: CatalogTerm[];
}
