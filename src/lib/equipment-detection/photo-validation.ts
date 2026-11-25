import { MAX_DETECTION_PHOTOS, MAX_DETECTION_UPLOAD_BYTES } from "@/lib/constants/equipment-detection";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import { buildTooLargeMessage } from "./detection-messages";
import type { StructuredOutputImageMediaType } from "@/lib/integrations/claude/structured-output-client";

/** A validated photo, only in memory until the AI call ends (never saved or logged). */
export interface DetectionPhoto {
  mediaType: StructuredOutputImageMediaType;
  base64Data: string;
}

interface ImageSignature {
  mediaType: StructuredOutputImageMediaType;
  /** Bytes expected at each offset. */
  parts: ReadonlyArray<{ offset: number; bytes: readonly number[] }>;
}

const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

const IMAGE_SIGNATURES: readonly ImageSignature[] = [
  { mediaType: "image/jpeg", parts: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  { mediaType: "image/png", parts: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }] },
  { mediaType: "image/webp", parts: [{ offset: 0, bytes: ascii("RIFF") }, { offset: 8, bytes: ascii("WEBP") }] },
];

function matches(bytes: Uint8Array, signature: ImageSignature): boolean {
  return signature.parts.every(({ offset, bytes: expected }) => expected.every((byte, index) => bytes[offset + index] === byte));
}

/** Real type from the file signature: the declared type and the file name come from the client and are not trusted. */
export function detectImageMediaType(bytes: Uint8Array): StructuredOutputImageMediaType | null {
  return IMAGE_SIGNATURES.find((signature) => matches(bytes, signature))?.mediaType ?? null;
}

function isPhotoFile(entry: unknown): entry is File {
  return entry instanceof File && entry.size > 0;
}

/** Cheap checks before reading any byte: count, files only, total size. */
function toPhotoFiles(entries: readonly unknown[]): File[] {
  if (entries.length === 0 || entries.length > MAX_DETECTION_PHOTOS) {
    throw new InvalidInputError(translate("equipmentDetection.photoCount", { max: MAX_DETECTION_PHOTOS }));
  }
  const files = entries.filter(isPhotoFile);
  if (files.length !== entries.length) throw new InvalidInputError(translate("errors.invalidInput"));
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_DETECTION_UPLOAD_BYTES) {
    throw new InvalidInputError(buildTooLargeMessage());
  }
  return files;
}

async function readPhoto(file: File): Promise<DetectionPhoto> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = detectImageMediaType(bytes);
  if (!mediaType) throw new InvalidInputError(translate("equipmentDetection.unsupportedType"));
  return { mediaType, base64Data: Buffer.from(bytes).toString("base64") };
}

/** Multipart entries of the photos field → validated photos (1 to 5, JPEG/PNG/WebP, 4 MB together). */
export async function readDetectionPhotos(entries: readonly unknown[]): Promise<DetectionPhoto[]> {
  return Promise.all(toPhotoFiles(entries).map(readPhoto));
}
