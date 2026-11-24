import { describe, expect, it } from "vitest";
import { EXERCISE_PAGE_SIZE_DEFAULT, EXERCISE_PAGE_SIZE_MAX, EXERCISE_SEARCH_MAX_LENGTH } from "@/lib/constants/catalog";
import { exerciseSearchSchema } from "./exercise-search-schema";

describe("exerciseSearchSchema", () => {
  it("applies defaults and treats empty form fields as absent", () => {
    expect(exerciseSearchSchema.parse({ q: "  ", muscle: "", equipment: "" })).toEqual({
      page: 1,
      pageSize: EXERCISE_PAGE_SIZE_DEFAULT,
    });
  });

  it("trims the search text and coerces numeric strings", () => {
    expect(exerciseSearchSchema.parse({ q: " supino ", muscle: "chest", page: "2", pageSize: "10" })).toEqual({
      query: "supino",
      muscle: "chest",
      page: 2,
      pageSize: 10,
    });
  });

  it.each([
    { page: "0" },
    { page: "abc" },
    { pageSize: String(EXERCISE_PAGE_SIZE_MAX + 1) },
    { muscle: "Not A Slug" },
    { q: "x".repeat(EXERCISE_SEARCH_MAX_LENGTH + 1) },
  ])("rejects %o", (input) => {
    expect(exerciseSearchSchema.safeParse(input).success).toBe(false);
  });
});
