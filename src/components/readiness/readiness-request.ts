import { sendJsonRequestForData, type JsonDataRequestResult } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { checkinResultSchema, type CheckinResult, type ReadinessCheckinInput } from "@/lib/readiness/readiness-schema";

export const READINESS_CHECKIN_ENDPOINT = "/api/readiness-checkins";

export function submitReadinessCheckin(payload: ReadinessCheckinInput): Promise<JsonDataRequestResult<CheckinResult>> {
  return sendJsonRequestForData(READINESS_CHECKIN_ENDPOINT, "POST", payload, checkinResultSchema, translate("readiness.failed"));
}
