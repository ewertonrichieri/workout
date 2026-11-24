import { sendJsonRequestForData, type JsonDataRequestResult } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { substitutionResultSchema, type SubstitutionRequest, type SubstitutionResult } from "@/lib/substitution/substitution-schema";

/** Equivalent exercises for a planned one (step 3B.4); can take a few seconds (AI). */
export function requestSubstitutes(workoutExerciseId: string, body: SubstitutionRequest): Promise<JsonDataRequestResult<SubstitutionResult>> {
  const url = `/api/workout-exercises/${encodeURIComponent(workoutExerciseId)}/substitutions`;
  return sendJsonRequestForData(url, "POST", body, substitutionResultSchema, translate("training.substitution.failed"));
}
