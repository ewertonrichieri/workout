import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { DETECTION_PHOTOS_FIELD, MAX_DETECTION_UPLOAD_BYTES } from "@/lib/constants/equipment-detection";
import { buildTooLargeMessage } from "@/lib/equipment-detection/detection-messages";
import { createServerEquipmentDetectionService } from "@/lib/equipment-detection/server-equipment-detection-service";
import { respondWithJson } from "@/lib/http/api-handler";
import { readFormData } from "@/lib/http/read-form-data";
import { createServerLogger } from "@/lib/http/server-logger";

const ROUTE = "/api/equipment-detections";

/** Must be a literal (static analysis): AI_TOTAL_TIMEOUT_MS (120 s) plus database and network headroom. */
export const maxDuration = 130;

/** POST (multipart, field "photos") — identifies the equipment in the photos (step 4.1); photos are never saved. */
export async function POST(request: NextRequest) {
  return respondWithJson({ route: ROUTE, logger: createServerLogger() }, async () => {
    await getAuthenticatedUserId();
    const form = await readFormData(request, { maxBytes: MAX_DETECTION_UPLOAD_BYTES, tooLargeMessage: buildTooLargeMessage() });
    const service = await createServerEquipmentDetectionService();
    return service.detectEquipment(form.getAll(DETECTION_PHOTOS_FIELD));
  });
}
