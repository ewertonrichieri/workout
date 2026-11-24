import { describe, expect, it } from "vitest";
import { filterCandidates, findSuggestionIssues, rankCandidates } from "./substitution-rules";

const ORIGINAL = { slug: "lever-chest-press", primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "shoulders"], equipment: ["machine"] };
const candidate = (slug: string, primaryMuscles: string[], secondaryMuscles: string[], equipment: string[]) => ({ slug, primaryMuscles, secondaryMuscles, equipment });

const BENCH_PRESS = candidate("dumbbell-bench-press", ["chest"], ["triceps", "shoulders"], ["dumbbell", "bench"]);
const PUSH_UP = candidate("push-up", ["chest"], ["triceps"], ["bodyweight"]);
const PEC_DECK = candidate("lever-pec-deck", ["chest"], [], ["machine"]);
const DIP = candidate("chest-dip", ["chest", "triceps"], ["shoulders"], ["dip-bars"]);

describe("filterCandidates", () => {
  it("removes exercises of today's workout and the excluded ones", () => {
    const result = filterCandidates([BENCH_PRESS, PUSH_UP, PEC_DECK], { original: ORIGINAL, reason: "other", excludedSlugs: new Set(["push-up"]) });
    expect(result.map((item) => item.slug)).toEqual(["dumbbell-bench-press", "lever-pec-deck"]);
  });

  it("drops the original's equipment when it is busy or broken, but never bodyweight", () => {
    const original = { ...ORIGINAL, equipment: ["machine", "bodyweight"] };
    for (const reason of ["equipment_busy", "equipment_broken"] as const) {
      const result = filterCandidates([BENCH_PRESS, PUSH_UP, PEC_DECK], { original, reason, excludedSlugs: new Set() });
      expect(result.map((item) => item.slug)).toEqual(["dumbbell-bench-press", "push-up"]);
    }
    expect(filterCandidates([PEC_DECK], { original, reason: null, excludedSlugs: new Set() })).toHaveLength(1);
  });
});

describe("rankCandidates", () => {
  it("orders by shared primary muscles, then shared secondary muscles, then slug", () => {
    expect(rankCandidates([PEC_DECK, PUSH_UP, BENCH_PRESS, DIP], ORIGINAL).map((item) => item.slug)).toEqual([
      "dumbbell-bench-press",
      "chest-dip",
      "push-up",
      "lever-pec-deck",
    ]);
  });
});

describe("findSuggestionIssues", () => {
  const slugs = new Set(["push-up", "dumbbell-bench-press"]);

  it("accepts 1 to 3 suggestions from the list", () => {
    expect(findSuggestionIssues({ suggestions: [{ exerciseSlug: "push-up", reason: "Sem aparelho" }] }, slugs)).toEqual([]);
  });

  it("rejects exercises outside the list and repeated ones", () => {
    expect(findSuggestionIssues({ suggestions: [{ exerciseSlug: "other", reason: "x" }] }, slugs)).toEqual(["unknown_exercise"]);
    expect(findSuggestionIssues({ suggestions: [{ exerciseSlug: "push-up", reason: "x" }, { exerciseSlug: "push-up", reason: "y" }] }, slugs)).toEqual(["duplicate_exercise"]);
  });
});
