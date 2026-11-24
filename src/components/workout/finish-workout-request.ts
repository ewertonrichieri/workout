import { sendJsonRequest, type JsonRequestResult } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import type { FinishWorkoutInput } from "@/lib/training/session-schema";

export const FINISH_WORKOUT_ENDPOINT = "/api/workout-sessions";

export function submitFinishedWorkout(payload: FinishWorkoutInput): Promise<JsonRequestResult> {
  return sendJsonRequest(FINISH_WORKOUT_ENDPOINT, "POST", payload, translate("training.finish.failed"));
}
