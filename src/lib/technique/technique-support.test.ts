import { describe, expect, it } from "vitest";
import { buildTechniqueHref, findTechniqueRuleSet } from "./technique-support";

describe("technique support (decision D3)", () => {
  it("supports only the squats in steps 5.1 to 5.4, filmed from the side", () => {
    expect(findTechniqueRuleSet("barbell-back-squat")).toMatchObject({ id: "squat", cameraView: "side" });
    expect(findTechniqueRuleSet("dumbbell-goblet-squat")).toMatchObject({ id: "squat", cameraView: "side" });
    expect(findTechniqueRuleSet("barbell-romanian-deadlift")).toBeUndefined();
    expect(findTechniqueRuleSet("leg-press")).toBeUndefined();
  });

  it("builds the technique screen link", () => {
    expect(buildTechniqueHref("barbell-back-squat")).toBe("/technique/barbell-back-squat");
  });
});
