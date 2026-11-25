// @vitest-environment node
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { detectImageMediaType, readDetectionPhotos } from "./photo-validation";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 1, 2];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1];
const WEBP = [...Buffer.from("RIFF"), 1, 2, 3, 4, ...Buffer.from("WEBP"), 9];
const GIF = [...Buffer.from("GIF89a"), 1];

function photo(bytes: number[], type = "image/jpeg") {
  return new File([new Uint8Array(bytes)], "foto.jpg", { type });
}

describe("detectImageMediaType", () => {
  it.each([
    [JPEG, "image/jpeg"],
    [PNG, "image/png"],
    [WEBP, "image/webp"],
    [GIF, null],
    [[0xff, 0xd8], null],
  ])("reads the real type from the file signature (%#)", (bytes, expected) => {
    expect(detectImageMediaType(new Uint8Array(bytes))).toBe(expected);
  });
});

describe("readDetectionPhotos", () => {
  it("returns every photo with the detected type in base64, ignoring the declared type", async () => {
    await expect(readDetectionPhotos([photo(WEBP, "image/jpeg"), photo(JPEG)])).resolves.toEqual([
      { mediaType: "image/webp", base64Data: Buffer.from(WEBP).toString("base64") },
      { mediaType: "image/jpeg", base64Data: Buffer.from(JPEG).toString("base64") },
    ]);
  });

  it.each([
    ["no photo", []],
    ["more than 5 photos", Array.from({ length: 6 }, () => photo(JPEG))],
    ["a text field instead of a file", ["texto"]],
    ["an empty file", [photo([])]],
    ["a type that is not JPEG, PNG or WebP", [photo(GIF, "image/gif")]],
  ])("rejects %s with a 400", async (_name, entries) => {
    await expect(readDetectionPhotos(entries)).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects photos that together pass the upload limit, before reading them", async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024)], "grande.jpg", { type: "image/jpeg" });
    const error = await readDetectionPhotos([big, photo(JPEG)]).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InvalidInputError);
    expect((error as InvalidInputError).message).toContain("4 MB");
  });
});
