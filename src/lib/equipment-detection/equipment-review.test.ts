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

describe("ready-made profiles against the curated vocabulary (step 4.3)", () => {
  it("only name equipment that exists in the catalog", async () => {
    const { readFileSync } = await import("node:fs");
    const { FULL_GYM_EXCLUDED_EQUIPMENT, PRESET_EQUIPMENT } = await import("@/lib/constants/equipment-detection");
    const vocabulary = JSON.parse(readFileSync("seed-data/catalog/vocabulary/equipment.json", "utf8")) as { entries: Array<{ slug: string }> };
    const known = new Set(vocabulary.entries.map((entry) => entry.slug));
    const named = [...FULL_GYM_EXCLUDED_EQUIPMENT, ...Object.values(PRESET_EQUIPMENT).flat()];
    expect(named.filter((slug) => !known.has(slug))).toEqual([]);
  });
});
