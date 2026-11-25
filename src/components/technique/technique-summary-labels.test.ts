import { describe, expect, it } from "vitest";
import { hingePattern } from "@/lib/technique/patterns/hinge-pattern";
import { rowPattern } from "@/lib/technique/patterns/row-pattern";
import { squatPattern } from "@/lib/technique/patterns/squat-pattern";
import { buildHingeRep, buildRep, buildRowRep } from "@/lib/technique/patterns/test-reps";
import { describeIssue, describeRepCount, describeRepMeasures, roundAngle } from "./technique-summary-labels";

const REP = buildRep(3, { descentMs: 1400 }, { minThighAngle: -4, maxTrunkLean: 33 });

describe("technique summary labels", () => {
  it("rounds 2D angles to 5°", () => {
    expect(roundAngle(33)).toBe(35);
    expect(roundAngle(32.4)).toBe(30);
    expect(roundAngle(-1)).toBe(0);
  });

  it("describes the squat depth (never 0° above parallel), trunk and descent", () => {
    expect(describeRepMeasures("squat", REP)).toEqual([
      "Profundidade: coxa na linha do joelho (paralela) ou abaixo",
      "Tronco: inclinação máxima de cerca de 35°",
      "Descida: 1,4 s",
    ]);
    expect(describeRepMeasures("squat", buildRep(1, {}, { minThighAngle: 18 }))[0]).toBe("Profundidade: coxa cerca de 20° acima da paralela");
    expect(describeRepMeasures("squat", buildRep(1, {}, { minThighAngle: 1 }))[0]).toBe("Profundidade: coxa cerca de 5° acima da paralela");
  });

  it("describes the hip hinge and the row with their own numbers", () => {
    expect(describeRepMeasures("hinge", buildHingeRep(1, { minHipAngle: 76, minKneeAngle: 148 }))).toEqual([
      "Quadril: fechou até cerca de 75°",
      "Joelho: cerca de 150° no ponto mais baixo",
      "Descida: 1,5 s",
    ]);
    expect(describeRepMeasures("row", buildRowRep(1, { maxWristHeight: 0.02, trunkRise: 11, restTrunkLean: 36 }))).toEqual([
      "Puxada: a mão parou na altura do quadril",
      "Tronco: subiu cerca de 10° na puxada",
      "Tronco inclinado cerca de 35° da vertical",
    ]);
    expect(describeRepMeasures("row", buildRowRep(1, { trunkRise: 2 })).slice(0, 2)).toEqual(["Puxada: a mão passou da linha do quadril", "Tronco: ficou parado na puxada"]);
  });

  it("describes issues with the degrees of each pattern", () => {
    expect(describeIssue(squatPattern, { issue: "trunk_lean_fatigue", severity: "error" }, buildRep(2, {}, { maxTrunkLean: 47 }), buildRep(1, {}, { maxTrunkLean: 30 }))).toBe(
      "Corrigir: o tronco inclinou cerca de 15° a mais que na 1ª repetição (sinal de cansaço)",
    );
    expect(describeIssue(squatPattern, { issue: "fast_descent", severity: "warning" }, REP, undefined)).toBe("Atenção: descida rápida (menos de 0,7 s); controle a descida");
    expect(describeIssue(hingePattern, { issue: "hinge_short_range", severity: "warning" }, buildHingeRep(2, { minHipAngle: 110 }), buildHingeRep(1, { minHipAngle: 75 }))).toBe(
      "Atenção: o quadril desceu cerca de 35° menos que na 1ª repetição (amplitude caindo)",
    );
    expect(describeIssue(rowPattern, { issue: "row_trunk_rise", severity: "warning" }, buildRowRep(1, { trunkRise: 12 }), undefined)).toBe(
      "Atenção: o tronco subiu cerca de 10° para puxar; mantenha o tronco parado",
    );
    expect(describeIssue(rowPattern, { issue: "row_trunk_upright", severity: "info" }, buildRowRep(1, { restTrunkLean: 34 }), undefined)).toBe(
      "Para conferir: tronco mais em pé que o comum na remada (cerca de 35° da vertical; o usual é de 40° a 65°)",
    );
  });

  it("counts reps in singular and plural", () => {
    expect(describeRepCount(1)).toBe("1 repetição contada");
    expect(describeRepCount(4)).toBe("4 repetições contadas");
  });
});
