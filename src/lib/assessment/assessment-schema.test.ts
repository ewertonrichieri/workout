import { describe, expect, it } from "vitest";
import { assessmentInputSchema, findAssessmentFieldErrors } from "./assessment-schema";

const VALID_INPUT = {
  goal: "hypertrophy",
  experienceLevel: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  splitPreference: "ai_decides",
  equipmentSlugs: ["dumbbell", "bench"],
  limitations: "  Dor no joelho esquerdo  ",
};

describe("assessment input schema", () => {
  it("accepts a complete assessment and trims the limitations", () => {
    expect(assessmentInputSchema.parse(VALID_INPUT)).toEqual({ ...VALID_INPUT, limitations: "Dor no joelho esquerdo" });
  });

  it("turns empty or missing limitations into null", () => {
    expect(assessmentInputSchema.parse({ ...VALID_INPUT, limitations: "   " }).limitations).toBeNull();
    expect(assessmentInputSchema.parse({ ...VALID_INPUT, limitations: null }).limitations).toBeNull();
  });

  it.each([
    ["unknown goal", { goal: "flexibility" }],
    ["unknown level", { experienceLevel: "expert" }],
    ["zero days", { daysPerWeek: 0 }],
    ["eight days", { daysPerWeek: 8 }],
    ["fractional days", { daysPerWeek: 2.5 }],
    ["too short session", { sessionMinutes: 9 }],
    ["too long session", { sessionMinutes: 241 }],
    ["unknown split", { splitPreference: "abcde" }],
    ["no equipment", { equipmentSlugs: [] }],
    ["repeated equipment", { equipmentSlugs: ["bench", "bench"] }],
    ["too long limitations", { limitations: "a".repeat(1001) }],
  ])("rejects %s", (_, override) => {
    expect(assessmentInputSchema.safeParse({ ...VALID_INPUT, ...override }).success).toBe(false);
  });

  it("lists the invalid fields once each", () => {
    const result = assessmentInputSchema.safeParse({ ...VALID_INPUT, daysPerWeek: 0, equipmentSlugs: ["bench", "bench"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(findAssessmentFieldErrors(result.error)).toEqual(["daysPerWeek", "equipmentSlugs"]);
  });
});
