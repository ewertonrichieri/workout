/** Identifiers of the curated catalog sources (stored in `source` columns). */
export const CATALOG_SOURCES = {
  freeExerciseDb: "free-exercise-db-with-videos",
  workoutFreeVideos: "workout-free-videos",
  exerciseLibrary: "exercise-library",
} as const;

export type CatalogSource = (typeof CATALOG_SOURCES)[keyof typeof CATALOG_SOURCES];

export const CATALOG_SOURCE_VALUES = Object.values(CATALOG_SOURCES) as [CatalogSource, ...CatalogSource[]];

export const EXERCISE_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const VIDEO_VARIANTS = ["male", "female"] as const;

/** Source order used to pick the main record of merged exercises (best curated first). */
export const SOURCE_PRIORITY: readonly CatalogSource[] = [
  CATALOG_SOURCES.workoutFreeVideos,
  CATALOG_SOURCES.freeExerciseDb,
  CATALOG_SOURCES.exerciseLibrary,
];

/** Supporting equipment that does not distinguish one exercise from another when matching. */
export const ACCESSORY_EQUIPMENT_SLUGS: ReadonlySet<string> = new Set(["bench"]);
