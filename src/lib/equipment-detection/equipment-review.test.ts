import { describe, expect, it } from "vitest";
import { buildReviewItems, resolvePresetSlugs } from "./equipment-review";

const VOCABULARY = [
  { slug: "barbell", name: "Barra" },
  { slug: "dumbbell", name: "Halteres" },
  { slug: "bench", name: "Banco" },
  { slug: "pull-up-bar", name: "Barra fixa" },
  { slug: "bodyweight", name: "Peso corporal" },
  { slug: "tire", name: "Pneu" },
];
const SLUGS = VOCABULARY.map((term) => term.slug);

describe("resolvePresetSlugs (D5)", () => {
  it("full gym = the whole vocabulary except tire, sledgehammer and massage ball", () => {
    expect(resolvePresetSlugs("full_gym", SLUGS)).toEqual(["barbell", "dumbbell", "bench", "pull-up-bar", "bodyweight"]);
  });

  it("keeps only catalog equipment, in catalog order", () => {
    expect(resolvePresetSlugs("home_dumbbells", SLUGS)).toEqual(["dumbbell", "bench", "bodyweight"]);
    expect(resolvePresetSlugs("bodyweight_only", SLUGS)).toEqual(["pull-up-bar", "bodyweight"]);
  });
});

describe("buildReviewItems (D4)", () => {
  it("checks high and medium, leaves low unchecked as 'maybe', and adds bodyweight checked", () => {
    const detected = [
      { slug: "barbell", name: "Barra", confidence: "high" as const, photoNumbers: [1] },
      { slug: "bench", name: "Banco", confidence: "medium" as const, photoNumbers: [1] },
      { slug: "tire", name: "Pneu", confidence: "low" as const, photoNumbers: [2] },
    ];
    expect(buildReviewItems(detected, VOCABULARY)).toEqual([
      { slug: "barbell", name: "Barra", confidence: "high", photoNumbers: [1], isChecked: true },
      { slug: "bench", name: "Banco", confidence: "medium", photoNumbers: [1], isChecked: true },
      { slug: "tire", name: "Pneu", confidence: "low", photoNumbers: [2], isChecked: false },
      { slug: "bodyweight", name: "Peso corporal", confidence: null, photoNumbers: [], isChecked: true },
    ]);
  });

  it("returns nothing when no equipment was found (the empty message shows instead)", () => {
    expect(buildReviewItems([], VOCABULARY)).toEqual([]);
  });
});
