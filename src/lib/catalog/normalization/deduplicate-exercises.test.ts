import { describe, expect, it } from "vitest";
import { buildSourceExercise, TEST_EQUIPMENT_VOCABULARY, TEST_MUSCLE_VOCABULARY } from "@/test/catalog-fixtures";
import type { SourceExercise } from "../source-exercise";
import { deduplicateExercises, UnknownDecisionReferenceError } from "./deduplicate-exercises";
import { normalizeSourceExercise, type NormalizedExercise } from "./normalize-source-exercise";
import { createVocabularyIndex } from "./vocabulary";

const vocabularies = {
  muscles: createVocabularyIndex(TEST_MUSCLE_VOCABULARY),
  equipment: createVocabularyIndex(TEST_EQUIPMENT_VOCABULARY),
};

function normalize(...sources: SourceExercise[]): NormalizedExercise[] {
  return sources.map((source) => normalizeSourceExercise(source, vocabularies).exercise);
}

function groupRefKeys(groups: NormalizedExercise[][]): string[][] {
  return groups.map((group) => group.map((exercise) => exercise.refKey));
}

const NO_DECISIONS = { merges: [] };

describe("deduplicateExercises", () => {
  it("merges exercises with the same name and equipment across sources, best source first", () => {
    const exercises = normalize(
      buildSourceExercise({ source: "exercise-library", externalId: "x1", nameEn: "fake dumbbell presses" }),
      buildSourceExercise({ source: "workout-free-videos", externalId: "w1", equipment: ["dumbbell", "bench"] }),
    );
    const { groups, reviewCandidates } = deduplicateExercises(exercises, NO_DECISIONS);
    expect(groupRefKeys(groups)).toEqual([["workout-free-videos:w1", "exercise-library:x1"]]);
    expect(reviewCandidates).toEqual([]);
  });

  it("keeps same-name exercises with different equipment apart and flags them for review", () => {
    const exercises = normalize(
      buildSourceExercise({ externalId: "a" }),
      buildSourceExercise({ externalId: "b", equipment: ["barbell"] }),
    );
    const { groups, reviewCandidates } = deduplicateExercises(exercises, NO_DECISIONS);
    expect(groups).toHaveLength(2);
    expect(reviewCandidates).toEqual([
      expect.objectContaining({
        kind: "same_name_different_equipment",
        refKeys: [["free-exercise-db-with-videos:a"], ["free-exercise-db-with-videos:b"]],
      }),
    ]);
  });

  it("flags alias matches for review instead of merging them", () => {
    const exercises = normalize(
      buildSourceExercise({ externalId: "a", nameEn: "Fake Flat Press", aliases: ["fake dumbbell press"] }),
      buildSourceExercise({ source: "exercise-library", externalId: "x1" }),
    );
    const { groups, reviewCandidates } = deduplicateExercises(exercises, NO_DECISIONS);
    expect(groups).toHaveLength(2);
    expect(reviewCandidates.map((candidate) => candidate.kind)).toEqual(["alias_match"]);
  });

  it("applies curated merge decisions and clears the matching review candidate", () => {
    const exercises = normalize(
      buildSourceExercise({ externalId: "a" }),
      buildSourceExercise({ externalId: "b", equipment: ["barbell"] }),
    );
    const decisions = {
      merges: [{ refKeys: ["free-exercise-db-with-videos:a", "free-exercise-db-with-videos:b"], reason: "same" }],
    };
    const { groups, reviewCandidates } = deduplicateExercises(exercises, decisions);
    expect(groupRefKeys(groups)).toEqual([["free-exercise-db-with-videos:a", "free-exercise-db-with-videos:b"]]);
    expect(reviewCandidates).toEqual([]);
  });

  it("refuses decisions that reference unknown exercises", () => {
    const decisions = { merges: [{ refKeys: ["exercise-library:missing", "exercise-library:x1"], reason: "x" }] };
    const exercises = normalize(buildSourceExercise({ source: "exercise-library", externalId: "x1" }));
    expect(() => deduplicateExercises(exercises, decisions)).toThrow(UnknownDecisionReferenceError);
  });
});
