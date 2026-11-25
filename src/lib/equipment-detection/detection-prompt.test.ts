import { describe, expect, it } from "vitest";
import { buildDetectionPrompt, buildPhotoLabel } from "./detection-prompt";

describe("detection prompt", () => {
  it("lists the vocabulary without bodyweight, with the photo count", () => {
    const prompt = buildDetectionPrompt([{ slug: "dumbbell", name: "Halteres" }, { slug: "bodyweight", name: "Peso corporal" }], 2);
    expect(prompt).toBe("Photos sent: 2\nEquipment list (slug | name in Brazilian Portuguese):\ndumbbell | Halteres");
  });

  it("labels photos from 1", () => {
    expect(buildPhotoLabel(1)).toBe("Photo 1");
  });
});
