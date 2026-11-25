import { afterEach, describe, expect, it, vi } from "vitest";
import { preparePhotos } from "./equipment-detection-request";
import { PhotoCompressionError } from "./photo-compression";

const compressPhoto = vi.hoisted(() => vi.fn<(file: File) => Promise<Blob>>());
vi.mock("./photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("./photo-compression")>()), compressPhoto }));

const photo = new File(["foto"], "a.jpg", { type: "image/jpeg" });

afterEach(() => compressPhoto.mockReset());

describe("preparePhotos", () => {
  it("returns the compressed photos", async () => {
    const compressed = new Blob(["x"], { type: "image/webp" });
    compressPhoto.mockResolvedValue(compressed);
    await expect(preparePhotos([photo, photo])).resolves.toEqual({ ok: true, photos: [compressed, compressed] });
  });

  it("explains when a photo cannot be read", async () => {
    compressPhoto.mockRejectedValue(new PhotoCompressionError());
    await expect(preparePhotos([photo])).resolves.toEqual({ ok: false, message: "Não foi possível ler uma das fotos. Tente outra foto, em JPEG, PNG ou WebP." });
  });

  it("refuses photos that stay above 4 MB together even after compression", async () => {
    compressPhoto.mockResolvedValue(new Blob([new Uint8Array(3 * 1024 * 1024)]));
    await expect(preparePhotos([photo, photo])).resolves.toEqual({ ok: false, message: "As fotos passam de 4 MB juntas. Envie menos fotos de cada vez." });
  });

  it("refuses an empty choice", async () => {
    await expect(preparePhotos([])).resolves.toMatchObject({ ok: false });
    expect(compressPhoto).not.toHaveBeenCalled();
  });
});
