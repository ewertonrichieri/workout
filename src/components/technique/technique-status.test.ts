import { describe, expect, it } from "vitest";
import { describeCountdown, describeFraming, describeRecording } from "./technique-status";

describe("technique status messages", () => {
  it("describes the framing in Portuguese", () => {
    expect(describeFraming("loading_model", null, false)).toBe("Preparando a análise...");
    expect(describeFraming("tracking", { isReady: false, issue: "feet_hidden" }, false)).toMatch(/Seus pés não aparecem/);
    expect(describeFraming("tracking", { isReady: true }, false)).toBe("Fique parado um instante...");
    expect(describeFraming("tracking", { isReady: true }, true)).toBe("Tudo certo! Seu corpo inteiro está aparecendo.");
  });

  it("counts down from 3 and shows the D8 recording cap", () => {
    expect(describeCountdown(0)).toBe("Começando em 3");
    expect(describeCountdown(2)).toBe("Começando em 1");
    expect(describeRecording(12)).toBe("12 s de 90 s");
  });
});
