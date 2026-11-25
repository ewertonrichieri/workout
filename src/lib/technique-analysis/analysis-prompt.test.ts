import { describe, expect, it } from "vitest";
import { hingePattern } from "@/lib/technique/patterns/hinge-pattern";
import { squatPattern } from "@/lib/technique/patterns/squat-pattern";
import { buildHingeRep } from "@/lib/technique/patterns/test-reps";
import { buildAnalysisPrompt } from "./analysis-prompt";
import { buildSquatRep } from "./test-fixtures";

describe("buildAnalysisPrompt", () => {
  it("sends only the exercise, the camera view, the limits and the numbers of each rep", () => {
    const prompt = buildAnalysisPrompt({
      exerciseName: "Agachamento livre com barra",
      cameraView: "side",
      pattern: squatPattern,
      assessments: [
        { rep: buildSquatRep(1), issues: [] },
        { rep: buildSquatRep(2, {}, { minThighAngle: 18.4 }), issues: [{ issue: "shallow_depth", severity: "error" }] },
        { rep: buildSquatRep(3, { isEvaluated: false }), issues: [] },
        { rep: buildSquatRep(4, {}, { minThighAngle: 0.4 }), issues: [{ issue: "shallow_depth", severity: "error" }] },
      ],
      hasLimitations: true,
    });
    expect(prompt).toContain("Exercise: Agachamento livre com barra");
    expect(prompt).toContain("Camera view: side");
    expect(prompt).toContain("Rep 2: knee 80°, thigh 18° above parallel, trunk 30°, descent 1.5 s, heel rise 0.00, knee past toes -0.10; issues: shallow_depth (error)");
    expect(prompt).toContain("Rep 3: not evaluated (body partly out of view)");
    expect(prompt).toContain("Rep 4: knee 80°, thigh 1° above parallel");
    expect(prompt).toContain("The person reported an injury or limitation");
    expect(prompt).toContain("Issue codes: shallow_depth, trunk_lean, trunk_lean_fatigue, heel_lift, fast_descent, knee_forward");
    expect(prompt).not.toMatch(/user|email|landmark/i);
  });

  it("uses the rules and the numbers of the movement pattern (hip hinge)", () => {
    const prompt = buildAnalysisPrompt({
      exerciseName: "Terra romeno com barra", cameraView: "side", pattern: hingePattern, hasLimitations: false,
      assessments: [{ rep: buildHingeRep(1, { minHipAngle: 74.6, minKneeAngle: 150 }), issues: [] }],
    });
    expect(prompt).toContain("Rep 1: hip 75° at the bottom, knee 150°, trunk 60° from vertical, descent 1.5 s; issues: none");
    expect(prompt).toContain("hinge_short_range: hip 25° or more less closed than in the first evaluated rep");
    expect(prompt).not.toContain("shallow_depth");
  });
});
