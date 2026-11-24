import { describe, expect, it } from "vitest";
import { describeDifficulty, describeLicense, describeSource } from "./exercise-labels";

describe("exercise labels", () => {
  it("translates difficulty, source and license", () => {
    expect(describeDifficulty("intermediate")).toBe("Intermediário");
    expect(describeSource("workout-free-videos")).toBe("Workout Free Videos");
    expect(describeLicense("CC0-1.0")).toBe("CC0 (domínio público)");
    expect(describeLicense("unverified")).toBe("a confirmar");
  });

  it("falls back to the raw value for unknown sources and licenses", () => {
    expect(describeSource("other-source")).toBe("other-source");
    expect(describeLicense("MIT")).toBe("MIT");
  });
});
