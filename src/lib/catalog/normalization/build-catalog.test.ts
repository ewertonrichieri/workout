import { describe, expect, it } from "vitest";
import { buildSourceExercise, TEST_EQUIPMENT_VOCABULARY, TEST_MUSCLE_VOCABULARY } from "@/test/catalog-fixtures";
import type { SourceExercise } from "../source-exercise";
import { buildCatalog, type CatalogBuildInput } from "./build-catalog";

function buildInput(sourceExercises: SourceExercise[], overrides: Partial<CatalogBuildInput> = {}): CatalogBuildInput {
  return {
    sourceExercises,
    muscleVocabulary: TEST_MUSCLE_VOCABULARY,
    equipmentVocabulary: TEST_EQUIPMENT_VOCABULARY,
    nameTranslations: {},
    duplicateDecisions: { merges: [] },
    ...overrides,
  };
}

const LIBRARY_GIF = { location: "repository_path", mediaType: "gif", path: "gifs/x1.gif" } as const;

describe("buildCatalog", () => {
  it("merges duplicates into one exercise led by the best source", () => {
    const result = buildCatalog(buildInput([
      buildSourceExercise({ source: "exercise-library", externalId: "x1", nameEn: "fake dumbbell press", difficulty: undefined, media: [LIBRARY_GIF] }),
      buildSourceExercise({ externalId: "f1", equipment: ["dumbbell", "bench"] }),
    ]));
    expect(result.exercises).toEqual([
      expect.objectContaining({
        slug: "fake-dumbbell-press",
        nameEn: "Fake Dumbbell Press",
        difficulty: "beginner",
        equipment: ["dumbbell", "bench"],
        sourceRefs: [
          { source: "free-exercise-db-with-videos", externalId: "f1" },
          { source: "exercise-library", externalId: "x1" },
        ],
      }),
    ]);
    expect(result.exercises[0].media.map((media) => media.source)).toEqual(["free-exercise-db-with-videos", "exercise-library"]);
  });

  it("gives same-name exercises with different equipment distinct slugs", () => {
    const result = buildCatalog(buildInput([
      buildSourceExercise({ externalId: "a", nameEn: "Fake Press" }),
      buildSourceExercise({ externalId: "b", nameEn: "Fake Press", equipment: ["barbell"] }),
    ]));
    expect(result.exercises.map((exercise) => exercise.slug)).toEqual(["fake-press", "fake-press-barbell"]);
  });

  it("uses curated pt-BR names by slug and reports missing and unused translations", () => {
    const result = buildCatalog(buildInput(
      [buildSourceExercise({ externalId: "a", nameEn: "Fake Press" }), buildSourceExercise({ externalId: "b", nameEn: "Fake Curl" })],
      { nameTranslations: { "fake-press": "Supino falso", "gone-exercise": "Exercício removido" } },
    ));
    expect(result.exercises.map((exercise) => exercise.namePt)).toEqual(["Supino falso", null]);
    expect(result.untranslatedSlugs).toEqual(["fake-curl"]);
    expect(result.unusedTranslationSlugs).toEqual(["gone-exercise"]);
  });

  it("surfaces unmapped vocabulary terms", () => {
    const result = buildCatalog(buildInput([buildSourceExercise({ primaryMuscles: ["quads"] })]));
    expect(result.unmappedTerms).toEqual([{ kind: "muscle", term: "quads", refKey: "free-exercise-db-with-videos:0001" }]);
  });

  it("takes muscles from the first record that has a primary muscle", () => {
    const result = buildCatalog(buildInput([
      buildSourceExercise({ source: "workout-free-videos", externalId: "w1", primaryMuscles: ["varies by movement"], secondaryMuscles: [] }),
      buildSourceExercise({ externalId: "f1", primaryMuscles: ["delts"], secondaryMuscles: ["triceps"] }),
    ]));
    expect(result.exercises[0]).toMatchObject({ primaryMuscles: ["shoulders"], secondaryMuscles: ["triceps"] });
  });
});
