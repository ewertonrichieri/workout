import { describe, expect, it } from "vitest";
import { buildExerciseSearchHref } from "./exercise-search-href";

describe("buildExerciseSearchHref", () => {
  it("keeps the active filters and the target page", () => {
    expect(buildExerciseSearchHref({ query: "supino reto", muscle: "chest" }, 2)).toBe("/exercises?q=supino+reto&muscle=chest&page=2");
  });

  it("omits the first page and empty filters", () => {
    expect(buildExerciseSearchHref({}, 1)).toBe("/exercises");
  });
});
