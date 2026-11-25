import {
  COMPRESSED_PHOTO_FALLBACK_TYPE,
  COMPRESSED_PHOTO_TYPE,
  PHOTO_COMPRESSION_QUALITY,
  PHOTO_MAX_DIMENSION_PX,
} from "@/lib/constants/equipment-detection";

/** The browser could not read or encode a photo (e.g. a format it does not decode). */
export class PhotoCompressionError extends Error {
  constructor() {
    super("photo compression failed");
    this.name = "PhotoCompressionError";
  }
}

interface Size {
  width: number;
  height: number;
}

/** Fits the image inside maxDimension on its longest side, keeping the proportion (never enlarges). */
export function computeScaledSize(width: number, height: number, maxDimension: number): Size {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Image decoding and canvas encoding exist (browsers without them hide the photo option). */
export function canCompressPhotos(): boolean {
  return typeof globalThis.createImageBitmap === "function" && typeof HTMLCanvasElement !== "undefined";
}

async function decodePhoto(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    if (error instanceof DOMException || error instanceof TypeError) throw new PhotoCompressionError();
    throw error;
  }
}

/** Draws the photo at the reduced size and releases the decoded image. */
function drawScaled(bitmap: ImageBitmap): HTMLCanvasElement {
  try {
    const { width, height } = computeScaledSize(bitmap.width, bitmap.height, PHOTO_MAX_DIMENSION_PX);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoCompressionError();
    context.drawImage(bitmap, 0, 0, width, height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, PHOTO_COMPRESSION_QUALITY));
}

/**
 * Decision D2 (like TinyPNG): resize to 1568 px and recompress with some quality loss, much lighter.
 * Re-encoding also drops the photo metadata (EXIF, GPS). Browsers without WebP encoding answer PNG: use JPEG.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  const canvas = drawScaled(await decodePhoto(file));
  const webp = await encode(canvas, COMPRESSED_PHOTO_TYPE);
  if (webp?.type === COMPRESSED_PHOTO_TYPE) return webp;
  const jpeg = await encode(canvas, COMPRESSED_PHOTO_FALLBACK_TYPE);
  if (!jpeg) throw new PhotoCompressionError();
  return jpeg;
}
