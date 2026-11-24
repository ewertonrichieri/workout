import type { SourceExercise } from "@/lib/catalog/source-exercise";
import type { Vocabulary } from "@/lib/catalog/normalization/vocabulary";

/** Fictitious vocabularies and exercises for catalog tests (never real source data). */
export const TEST_MUSCLE_VOCABULARY: Vocabulary = {
  entries: [
    { slug: "chest", namePt: "Peitoral", aliases: ["pectorals"] },
    { slug: "triceps", namePt: "Tríceps", aliases: ["triceps brachii"] },
    { slug: "shoulders", namePt: "Ombros", aliases: ["delts"] },
  ],
  ignored: ["varies by movement"],
};

export const TEST_EQUIPMENT_VOCABULARY: Vocabulary = {
  entries: [
    { slug: "dumbbell", namePt: "Halteres", aliases: [] },
    { slug: "barbell", namePt: "Barra", aliases: [] },
    { slug: "bench", namePt: "Banco", aliases: [] },
    { slug: "bodyweight", namePt: "Peso corporal", aliases: ["body weight"] },
  ],
  ignored: [],
};

export function buildSourceExercise(overrides: Partial<SourceExercise> = {}): SourceExercise {
  return {
    source: "free-exercise-db-with-videos",
    externalId: "0001",
    nameEn: "Fake Dumbbell Press",
    aliases: [],
    primaryMuscles: ["pectorals"],
    secondaryMuscles: ["triceps"],
    equipment: ["dumbbell"],
    difficulty: "beginner",
    instructionSteps: ["Press."],
    media: [{ location: "url", mediaType: "video", url: "https://media.example.test/a.mp4", variant: "male" }],
    ...overrides,
  };
}
