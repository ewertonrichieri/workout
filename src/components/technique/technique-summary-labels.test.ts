import { describe, expect, it } from "vitest";
import type { SquatRep } from "@/lib/technique/squat/squat-rep-tracker";
import { describeDepth, describeDescent, describeIssue, describeRepCount, describeTrunk, roundAngle } from "./technique-summary-labels";

const REP: SquatRep = {
  repNumber: 3, startMs: 0, bottomMs: 1400, endMs: 3000, descentMs: 1400, minKneeAngle: 80, minThighAngle: -4, maxTrunkLean: 33,
  maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 30, seenFrameCount: 30, isEvaluated: true,
};

describe("technique summary labels", () => {
  it("rounds 2D angles to 5°", () => {
    expect(roundAngle(33)).toBe(35);
    expect(roundAngle(32.4)).toBe(30);
    expect(roundAngle(-1)).toBe(0);
  });

  it("describes the depth, never saying 0° above parallel", () => {
    expect(describeDepth(REP)).toBe("Profundidade: coxa na linha do joelho (paralela) ou abaixo");
    expect(describeDepth({ ...REP, minThighAngle: 18 })).toBe("Profundidade: coxa cerca de 20° acima da paralela");
    expect(describeDepth({ ...REP, minThighAngle: 1 })).toBe("Profundidade: coxa cerca de 5° acima da paralela");
  });

  it("describes trunk and descent in Portuguese", () => {
    expect(describeTrunk(REP)).toBe("Tronco: inclinação máxima de cerca de 35°");
    expect(describeDescent(REP)).toBe("Descida: 1,4 s");
  });

  it("describes issues, with the fatigue difference against the first rep", () => {
    expect(describeIssue({ issue: "trunk_lean_fatigue", severity: "error" }, { ...REP, maxTrunkLean: 47 }, 30)).toBe(
      "Corrigir: o tronco inclinou cerca de 15° a mais que na 1ª repetição (sinal de cansaço)",
    );
    expect(describeIssue({ issue: "shallow_depth", severity: "info" }, REP, 30)).toBe("Para conferir: a coxa não chegou à linha do joelho (paralela)");
    expect(describeIssue({ issue: "fast_descent", severity: "warning" }, REP, null)).toBe("Atenção: descida rápida (menos de 1 s); controle a descida");
  });

  it("counts reps in singular and plural", () => {
    expect(describeRepCount(1)).toBe("1 repetição contada");
    expect(describeRepCount(4)).toBe("4 repetições contadas");
  });
});
