import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/translate";

describe("translate", () => {
  it("returns the pt-BR text for a nested key", () => {
    expect(translate("navigation.workout")).toBe("Treino");
  });

  it("interpolates parameters", () => {
    expect(translate("errors.notFound", { resource: "Treino" })).toBe("Treino não encontrado.");
  });

  it("keeps the placeholder when a parameter is missing", () => {
    expect(translate("errors.notFound")).toBe("{resource} não encontrado.");
  });

  it("rejects unknown keys at compile time", () => {
    // @ts-expect-error unknown key must not type-check
    expect(() => translate("navigation.unknown")).toThrow();
  });
});
