import type { ClaudeEffort } from "@/lib/constants/ai";

/** Equipment identified from gym photos (spec 013, step 4.1). */
export const EQUIPMENT_DETECTION_OPERATION = "equipment.detect";
/** Decision D7: a short visual check; reevaluate after the real call. */
export const EQUIPMENT_DETECTION_EFFORT: ClaudeEffort = "low";

/** Decision D1. */
export const MAX_DETECTION_PHOTOS = 5;
/**
 * All photos of one analysis together. Below the 4.5 MB request limit of Vercel functions (PRD deploy)
 * and the 10 MB proxy buffer; compressed photos (D2) weigh a few hundred KB each.
 */
export const MAX_DETECTION_UPLOAD_MEGABYTES = 4;
export const MAX_DETECTION_UPLOAD_BYTES = MAX_DETECTION_UPLOAD_MEGABYTES * 1024 * 1024;
/** Multipart field of POST /api/equipment-detections. */
export const DETECTION_PHOTOS_FIELD = "photos";

/** Decision D2: the device resizes and recompresses every photo before sending. */
export const PHOTO_MAX_DIMENSION_PX = 1568;
export const PHOTO_COMPRESSION_QUALITY = 0.7;
export const COMPRESSED_PHOTO_TYPE = "image/webp";
/** Browsers that cannot encode WebP. */
export const COMPRESSED_PHOTO_FALLBACK_TYPE = "image/jpeg";

export const DETECTION_CONFIDENCES = ["high", "medium", "low"] as const;
export type DetectionConfidence = (typeof DETECTION_CONFIDENCES)[number];
/** Decision D4: only these come checked in the review; "low" shows as "Talvez". */
export const PRESELECTED_CONFIDENCES: readonly DetectionConfidence[] = ["high", "medium"];
