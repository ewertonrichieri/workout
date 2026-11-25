import { describe, expect, it } from "vitest";
import { buildTechniqueHref, findTechniqueRuleSet } from "./technique-support";

describe("technique support (decision D3)", () => {
  it("maps each supported exercise to its movement pattern, filmed from the side (D3, D15)", () => {
    expect(findTechniqueRuleSet("barbell-back-squat")).toMatchObject({ id: "squat", cameraView: "side" });
    expect(findTechniqueRuleSet("dumbbell-goblet-squat")).toMatchObject({ id: "squat", cameraView: "side" });
    expect(findTechniqueRuleSet("barbell-romanian-deadlift")).toMatchObject({ id: "hinge", cameraView: "side" });
    expect(findTechniqueRuleSet("dumbbell-stiff-leg-deadlift")).toMatchObject({ id: "hinge" });
    expect(findTechniqueRuleSet("barbell-bent-over-row")).toMatchObject({ id: "row", cameraView: "side" });
    expect(findTechniqueRuleSet("dumbbell-bent-over-row")).toMatchObject({ id: "row" });
  });

  it("leaves out machines, one-arm rows and the good morning", () => {
    expect(findTechniqueRuleSet("leg-press")).toBeUndefined();
    expect(findTechniqueRuleSet("dumbbell-one-arm-bent-over-row")).toBeUndefined();
    expect(findTechniqueRuleSet("good-morning")).toBeUndefined();
  });

  it("builds the technique screen link", () => {
    expect(buildTechniqueHref("barbell-back-squat")).toBe("/technique/barbell-back-squat");
  });
});
