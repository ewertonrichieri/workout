import { MAX_DETECTION_UPLOAD_MEGABYTES } from "@/lib/constants/equipment-detection";
import { translate } from "@/lib/i18n/translate";

/** Same message on the device, for the declared body size (route) and for the files themselves (service). */
export function buildTooLargeMessage(): string {
  return translate("equipmentDetection.tooLarge", { maxMegabytes: MAX_DETECTION_UPLOAD_MEGABYTES });
}
