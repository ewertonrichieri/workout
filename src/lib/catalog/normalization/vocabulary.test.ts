import { describe, expect, it } from "vitest";
import { createVocabularyIndex, mapTerms, VocabularyCollisionError, type Vocabulary } from "./vocabulary";

const vocabulary: Vocabulary = {
  entries: [
    { slug: "chest", namePt: "Peitoral", aliases: ["chest", "pectorals", "upper chest"] },
    { slug: "hip-flexors", namePt: "Flexores do quadril", aliases: ["hip flexors", "iliopsoas"] },
  ],
  ignored: ["varies by movement"],
};

describe("mapTerms", () => {
  const index = createVocabularyIndex(vocabulary);

  it("maps raw terms to canonical slugs without repeating them", () => {
    expect(mapTerms(index, ["Pectorals", "upper chest", "hipFlexors"])).toEqual({
      slugs: ["chest", "hip-flexors"],
      unmapped: [],
    });
  });

  it("drops explicitly ignored terms", () => {
    expect(mapTerms(index, ["varies by movement", "chest"])).toEqual({ slugs: ["chest"], unmapped: [] });
  });

  it("reports unknown terms instead of guessing", () => {
    expect(mapTerms(index, ["chest", "biceps"])).toEqual({ slugs: ["chest"], unmapped: ["biceps"] });
  });

  it("accepts the slug itself as an alias", () => {
    expect(mapTerms(index, ["hip-flexors"]).slugs).toEqual(["hip-flexors"]);
  });
});

describe("createVocabularyIndex", () => {
  it("refuses an alias used by two entries", () => {
    const broken: Vocabulary = {
      entries: [
        { slug: "chest", namePt: "Peitoral", aliases: ["pecs"] },
        { slug: "upper-chest", namePt: "Peitoral superior", aliases: ["pecs"] },
      ],
      ignored: [],
    };
    expect(() => createVocabularyIndex(broken)).toThrow(VocabularyCollisionError);
  });

  it("refuses a term that is both mapped and ignored", () => {
    const broken: Vocabulary = { entries: vocabulary.entries, ignored: ["chest"] };
    expect(() => createVocabularyIndex(broken)).toThrow(VocabularyCollisionError);
  });
});
