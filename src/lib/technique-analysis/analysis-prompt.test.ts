import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt } from "./analysis-prompt";
import { buildSquatRep } from "./test-fixtures";

describe("buildAnalysisPrompt", () => {
  it("sends only the exercise, the camera view, the limits and the numbers of each rep", () => {
    const prompt = buildAnalysisPrompt({
      exerciseName: "Agachamento livre com barra",
      cameraView: "side",
      assessments: [
        { rep: buildSquatRep(1), issues: [] },
        { rep: buildSquatRep(2, { minThighAngle: 18.4 }), issues: [{ issue: "shallow_depth", severity: "error" }] },
        { rep: buildSquatRep(3, { isEvaluated: false }), issues: [] },
        { rep: buildSquatRep(4, { minThighAngle: 0.4 }), issues: [{ issue: "shallow_depth", severity: "error" }] },
      ],
      hasLimitations: true,
    });
    expect(prompt).toContain("Exercise: Agachamento livre com barra");
    expect(prompt).toContain("Camera view: side");
    expect(prompt).toContain("Rep 2: knee 80°, thigh 18° above parallel, trunk 30°, descent 1.5 s, heel rise 0.00, knee past toes -0.10; issues: shallow_depth (error)");
    expect(prompt).toContain("Rep 3: not evaluated (body partly out of view)");
    expect(prompt).toContain("Rep 4: knee 80°, thigh 1° above parallel");
    expect(prompt).toContain("The person reported an injury or limitation");
    expect(prompt).not.toMatch(/user|email|landmark/i);
  });
});
