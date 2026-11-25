import { afterEach, describe, expect, it, vi } from "vitest";
import { canCompressPhotos, compressPhoto, computeScaledSize, PhotoCompressionError } from "./photo-compression";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("computeScaledSize", () => {
  it.each([
    [[4032, 3024], [1568, 1176]],
    [[3024, 4032], [1176, 1568]],
    [[800, 600], [800, 600]],
    [[1568, 10], [1568, 10]],
  ])("fits %j inside 1568 px keeping the proportion", ([width, height], expected) => {
    expect(computeScaledSize(width, height, 1568)).toEqual({ width: expected[0], height: expected[1] });
  });
});

function stubBrowser(encodedTypes: Array<string | null>) {
  const close = vi.fn();
  const decode = vi.fn(async () => ({ width: 4032, height: 3024, close }));
  vi.stubGlobal("createImageBitmap", decode);
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback, type) {
    const encodedType = encodedTypes.shift();
    callback(encodedType === null || encodedType === undefined ? null : new Blob(["x"], { type: encodedType === "same" ? type : encodedType }));
  });
  return { decode, drawImage, toBlob, close };
}

const original = new File(["big"], "IMG_0001.HEIC", { type: "image/heic" });

describe("compressPhoto", () => {
  it("decodes with the photo orientation, resizes and recompresses as WebP 0.7", async () => {
    const { decode, drawImage, toBlob, close } = stubBrowser(["same"]);
    const compressed = await compressPhoto(original);
    expect(compressed.type).toBe("image/webp");
    expect(decode).toHaveBeenCalledWith(original, { imageOrientation: "from-image" });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1568, 1176);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.7);
    expect(close).toHaveBeenCalled();
  });

  it("falls back to JPEG 0.7 when the browser cannot encode WebP (it answers PNG)", async () => {
    const { toBlob } = stubBrowser(["image/png", "same"]);
    const compressed = await compressPhoto(original);
    expect(compressed.type).toBe("image/jpeg");
    expect(toBlob).toHaveBeenLastCalledWith(expect.any(Function), "image/jpeg", 0.7);
  });

  it("fails with a compression error when the photo cannot be read", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new DOMException("bad", "InvalidStateError"); }));
    await expect(compressPhoto(original)).rejects.toBeInstanceOf(PhotoCompressionError);
  });

  it("fails with a compression error when nothing can be encoded", async () => {
    stubBrowser([null, null]);
    await expect(compressPhoto(original)).rejects.toBeInstanceOf(PhotoCompressionError);
  });
});

describe("canCompressPhotos", () => {
  it("needs image decoding in the browser", () => {
    vi.stubGlobal("createImageBitmap", undefined);
    expect(canCompressPhotos()).toBe(false);
    vi.stubGlobal("createImageBitmap", vi.fn());
    expect(canCompressPhotos()).toBe(true);
  });
});
