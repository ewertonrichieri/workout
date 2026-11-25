import { describe, expect, it } from "vitest";
import type { RepAssessment } from "@/lib/technique/technique-summary";
import { sanitizeAnalysis } from "./analysis-rules";
import type { AiTechniqueAnalysis } from "./analysis-schema";
import { buildSquatRep } from "./test-fixtures";

const OUTPUT: AiTechniqueAnalysis = {
  overallScore: 7,
  reps: [{ repNumber: 1, score: 8 }, { repNumber: 2, score: 6 }],
  strengths: ["Boa profundidade na 1ª repetição."],
  corrections: [{ issue: "shallow_depth", repNumbers: [2], text: "Desça até a coxa ficar paralela ao chão." }],
  mainTip: "Controle a descida.",
};

/** Rep 1 good; rep 2 shallow (error) with the knee ahead of the toes (info); rep 3 not evaluated. */
const ASSESSMENTS: RepAssessment[] = [
  { rep: buildSquatRep(1), issues: [] },
  { rep: buildSquatRep(2), issues: [{ issue: "shallow_depth", severity: "error" }, { issue: "knee_forward", severity: "info" }] },
  { rep: buildSquatRep(3, { isEvaluated: false }), issues: [] },
];

describe("sanitizeAnalysis (spec 014: the AI may only cite what was measured)", () => {
  it("keeps a valid answer as it is", () => {
    expect(sanitizeAnalysis(OUTPUT, ASSESSMENTS)).toEqual({ analysis: OUTPUT, issues: [] });
  });

  it("drops scores of reps that were not sent or not evaluated", () => {
    const result = sanitizeAnalysis({ ...OUTPUT, reps: [...OUTPUT.reps, { repNumber: 3, score: 9 }, { repNumber: 9, score: 2 }] }, ASSESSMENTS);
    expect(result.analysis.reps).toEqual(OUTPUT.reps);
    expect(result.issues).toEqual(["unknown_rep_number"]);
  });

  it("drops corrections outside the vocabulary, for issues the rules did not flag, or for issues that only inform", () => {
    const corrections = [
      { issue: "valgus_knee", repNumbers: [1], text: "Joelho para dentro." },
      { issue: "shallow_depth", repNumbers: [1, 2, 7], text: "Desça mais." },
      { issue: "fast_descent", repNumbers: [2], text: "Mais devagar." },
      { issue: "knee_forward", repNumbers: [2], text: "Joelho passou da ponta do pé." },
    ];
    const result = sanitizeAnalysis({ ...OUTPUT, corrections }, ASSESSMENTS);
    expect(result.analysis.corrections).toEqual([{ issue: "shallow_depth", repNumbers: [2], text: "Desça mais." }]);
    expect(result.issues).toEqual(["unknown_issue", "unflagged_issue"]);
  });

  it("cuts long texts at a word boundary, never in the middle of a word", () => {
    const words = "Desça até a coxa ficar paralela ao chão ".repeat(10);
    const result = sanitizeAnalysis({ ...OUTPUT, mainTip: words }, ASSESSMENTS);
    expect(result.analysis.mainTip.length).toBeLessThanOrEqual(240);
    expect(result.analysis.mainTip).toMatch(/\p{L}…$/u);
  });

  it("clamps scores to 0–10, trims texts and limits the number of items", () => {
    const longText = "a".repeat(400);
    const result = sanitizeAnalysis({
      ...OUTPUT, overallScore: 14, reps: [{ repNumber: 1, score: -2 }], mainTip: `  ${longText}  `,
      strengths: ["  um  ", "", "dois", "três", "quatro"],
    }, ASSESSMENTS);
    expect(result.analysis.overallScore).toBe(10);
    expect(result.analysis.reps).toEqual([{ repNumber: 1, score: 0 }]);
    expect(result.analysis.mainTip).toHaveLength(240);
    expect(result.analysis.mainTip.endsWith("…")).toBe(true);
    expect(result.analysis.strengths).toEqual(["um", "dois", "três"]);
  });
});
