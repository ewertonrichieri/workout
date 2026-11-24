import { describe, expect, it } from "vitest";
import { buildNameMatchKey, normalizeTerm, repairMojibake, toSlug } from "./text-normalization";

describe("normalizeTerm", () => {
  it("splits camelCase, lowercases and collapses punctuation", () => {
    expect(normalizeTerm("hipFlexors")).toBe("hip flexors");
    expect(normalizeTerm("  Body-Weight ")).toBe("body weight");
    expect(normalizeTerm("varies by machine (legs, glutes)")).toBe("varies by machine legs glutes");
  });

  it("removes accents", () => {
    expect(normalizeTerm("Glúteo Médio")).toBe("gluteo medio");
  });
});

describe("buildNameMatchKey", () => {
  it("matches hyphen, case and simple plural variants", () => {
    expect(buildNameMatchKey("Sit-Ups")).toBe(buildNameMatchKey("sit up"));
    expect(buildNameMatchKey("Triceps Dip")).toBe(buildNameMatchKey("tricep dip"));
  });

  it("handles -es plurals", () => {
    expect(buildNameMatchKey("Bench Presses")).toBe("bench press");
    expect(buildNameMatchKey("Cable Crunches")).toBe("cable crunch");
    expect(buildNameMatchKey("Lateral Raises")).toBe("lateral raise");
  });

  it("keeps double-s words intact", () => {
    expect(buildNameMatchKey("Leg Press")).toBe("leg press");
  });

  it("treats the degree sign as the word degree", () => {
    expect(buildNameMatchKey("sled 45° calf press")).toBe(buildNameMatchKey("Sled 45 Degree Calf Press"));
  });

  it("ignores media-only qualifiers but keeps exercise qualifiers", () => {
    expect(buildNameMatchKey("leg press (side pov)")).toBe(buildNameMatchKey("leg press"));
    expect(buildNameMatchKey("push-up (female)")).toBe(buildNameMatchKey("push-up"));
    expect(buildNameMatchKey("seated row (v-bar)")).not.toBe(buildNameMatchKey("seated row"));
  });
});

describe("toSlug", () => {
  it("builds a kebab-case ascii slug", () => {
    expect(toSlug("Barbell Bench Press (Wide-Grip)")).toBe("barbell-bench-press-wide-grip");
    expect(toSlug("sled 45° leg press")).toBe("sled-45-degree-leg-press");
  });
});

describe("repairMojibake", () => {
  it("restores the degree sign from known broken encodings", () => {
    expect(repairMojibake("sled 45Ð²Â° leg press")).toBe("sled 45° leg press");
    expect(repairMojibake("45Â° side bend")).toBe("45° side bend");
  });

  it("leaves clean text untouched", () => {
    expect(repairMojibake("Barbell Curl")).toBe("Barbell Curl");
  });
});
