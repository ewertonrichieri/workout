import { describe, expect, it } from "vitest";
import { buildSourceExercise, TEST_EQUIPMENT_VOCABULARY, TEST_MUSCLE_VOCABULARY } from "@/test/catalog-fixtures";
import { normalizeSourceExercise, type CatalogVocabularies } from "./normalize-source-exercise";
import { createVocabularyIndex } from "./vocabulary";

const vocabularies: CatalogVocabularies = {
  muscles: createVocabularyIndex(TEST_MUSCLE_VOCABULARY),
  equipment: createVocabularyIndex(TEST_EQUIPMENT_VOCABULARY),
};

describe("normalizeSourceExercise", () => {
  it("maps muscles and equipment to canonical slugs", () => {
    const { exercise, unmappedTerms } = normalizeSourceExercise(buildSourceExercise(), vocabularies);
    expect(exercise).toMatchObject({
      refKey: "free-exercise-db-with-videos:0001",
      nameKey: "fake dumbbell press",
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps"],
      equipment: ["dumbbell"],
      equipmentKey: "dumbbell",
    });
    expect(unmappedTerms).toEqual([]);
  });

  it("does not repeat a primary muscle as secondary", () => {
    const source = buildSourceExercise({ secondaryMuscles: ["pectorals", "delts"] });
    expect(normalizeSourceExercise(source, vocabularies).exercise.secondaryMuscles).toEqual(["shoulders"]);
  });

  it("ignores accessory equipment in the matching key", () => {
    const source = buildSourceExercise({ equipment: ["dumbbell", "bench"] });
    const { exercise } = normalizeSourceExercise(source, vocabularies);
    expect(exercise.equipment).toEqual(["dumbbell", "bench"]);
    expect(exercise.equipmentKey).toBe("dumbbell");
  });

  it("keeps accessory equipment in the key when it is the only equipment", () => {
    const source = buildSourceExercise({ equipment: ["bench"] });
    expect(normalizeSourceExercise(source, vocabularies).exercise.equipmentKey).toBe("bench");
  });

  it("builds alias keys and strips media-only qualifiers from the display name", () => {
    const source = buildSourceExercise({ nameEn: "Fake Press (female)", aliases: ["Flat Presses"] });
    const { exercise } = normalizeSourceExercise(source, vocabularies);
    expect(exercise.displayNameEn).toBe("Fake Press");
    expect(exercise.aliasKeys).toEqual(["flat press"]);
  });

  it("reports unknown terms with their kind and source", () => {
    const source = buildSourceExercise({ primaryMuscles: ["quads"], equipment: ["kettlebell"] });
    expect(normalizeSourceExercise(source, vocabularies).unmappedTerms).toEqual([
      { kind: "muscle", term: "quads", refKey: "free-exercise-db-with-videos:0001" },
      { kind: "equipment", term: "kettlebell", refKey: "free-exercise-db-with-videos:0001" },
    ]);
  });
});
