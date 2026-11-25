import { DETECTION_PHOTOS_FIELD, MAX_DETECTION_PHOTOS, MAX_DETECTION_UPLOAD_BYTES } from "@/lib/constants/equipment-detection";
import { equipmentDetectionResultSchema, type EquipmentDetectionResult } from "@/lib/equipment-detection/detection-schema";
import { buildTooLargeMessage } from "@/lib/equipment-detection/detection-messages";
import { sendFormRequestForData, type JsonDataRequestResult } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { compressPhoto, PhotoCompressionError } from "./photo-compression";

export const EQUIPMENT_DETECTIONS_ENDPOINT = "/api/equipment-detections";

export type PreparePhotosResult = { ok: true; photos: Blob[] } | { ok: false; message: string };

/** Checks the count and compresses every photo on the device (decision D2) before anything is sent. */
export async function preparePhotos(files: readonly File[]): Promise<PreparePhotosResult> {
  if (files.length === 0 || files.length > MAX_DETECTION_PHOTOS) {
    return { ok: false, message: translate("equipmentDetection.photoCount", { max: MAX_DETECTION_PHOTOS }) };
  }
  try {
    const photos = await Promise.all(files.map(compressPhoto));
    const totalBytes = photos.reduce((sum, photo) => sum + photo.size, 0);
    return totalBytes > MAX_DETECTION_UPLOAD_BYTES ? { ok: false, message: buildTooLargeMessage() } : { ok: true, photos };
  } catch (error) {
    if (error instanceof PhotoCompressionError) return { ok: false, message: translate("equipmentDetection.compressionFailed") };
    throw error;
  }
}

/** Sends the compressed photos; never throws (failures become a pt-BR message). */
export function requestEquipmentDetection(photos: readonly Blob[]): Promise<JsonDataRequestResult<EquipmentDetectionResult>> {
  const body = new FormData();
  photos.forEach((photo, index) => body.append(DETECTION_PHOTOS_FIELD, photo, `photo-${index + 1}`));
  return sendFormRequestForData(EQUIPMENT_DETECTIONS_ENDPOINT, body, equipmentDetectionResultSchema, translate("equipmentDetection.failed"));
}
