import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CatalogSourceFormatError, parseSourceItems } from "./parse-source-items";
import type { SourceExercise } from "../source-exercise";

const rawItemSchema = z.object({ id: z.string(), name: z.string() });
type RawItem = z.infer<typeof rawItemSchema>;

function mapItem(item: RawItem): SourceExercise {
  return {
    source: "workout-free-videos",
    externalId: item.id,
    nameEn: item.name,
    aliases: [],
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    equipment: ["dumbbell"],
    instructionSteps: [],
    media: [{ location: "repository_path", mediaType: "video", path: `media/${item.id}.mp4` }],
  };
}

describe("parseSourceItems", () => {
  it("maps valid items", () => {
    const result = parseSourceItems([{ id: "a1", name: "Press" }], rawItemSchema, mapItem);
    expect(result.exercises.map((exercise) => exercise.externalId)).toEqual(["a1"]);
    expect(result.rejected).toEqual([]);
  });

  it("rejects invalid items without failing the whole source", () => {
    const result = parseSourceItems([{ id: "a1", name: "Press" }, { id: 7 }], rawItemSchema, mapItem);
    expect(result.exercises).toHaveLength(1);
    expect(result.rejected).toEqual([expect.objectContaining({ index: 1 })]);
  });

  it("rejects repeated source ids, keeping the first", () => {
    const result = parseSourceItems(
      [{ id: "a1", name: "Press" }, { id: "a1", name: "Other" }],
      rawItemSchema,
      mapItem,
    );
    expect(result.exercises.map((exercise) => exercise.nameEn)).toEqual(["Press"]);
    expect(result.rejected).toEqual([expect.objectContaining({ index: 1, externalId: "a1" })]);
  });

  it("rejects items whose mapped output breaks the common schema", () => {
    const result = parseSourceItems([{ id: "a1", name: "" }], rawItemSchema, mapItem);
    expect(result.exercises).toEqual([]);
    expect(result.rejected).toHaveLength(1);
  });

  it("throws when the source is not a list", () => {
    expect(() => parseSourceItems({ exercises: [] }, rawItemSchema, mapItem)).toThrow(
      CatalogSourceFormatError,
    );
  });
});
