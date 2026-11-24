import { sendJsonRequest, sendJsonRequestForData, type JsonDataRequestResult, type JsonRequestResult } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { adjustmentProposalSchema, type AdjustmentChange, type AdjustmentProposal, type ProposedChange } from "@/lib/readiness/adjustment-schema";
import { READINESS_CHECKIN_ENDPOINT } from "./readiness-request";

function adjustmentEndpoint(checkinId: string): string {
  return `${READINESS_CHECKIN_ENDPOINT}/${encodeURIComponent(checkinId)}/adjustment`;
}

/** Asks the AI for today's adjustment (step 3B.2); can take up to 2 minutes. */
export function requestAdjustmentProposal(checkinId: string): Promise<JsonDataRequestResult<AdjustmentProposal>> {
  return sendJsonRequestForData(adjustmentEndpoint(checkinId), "POST", {}, adjustmentProposalSchema, translate("readiness.adjustment.failedFallback"));
}

/** The replacement's name and media are for display only; the server reads the exercise by slug. */
function toChange(change: ProposedChange): AdjustmentChange {
  const { workoutExerciseId, changeType, replacementSlug, sets, repsMin, repsMax, reason } = change;
  return { workoutExerciseId, changeType, replacementSlug, sets, repsMin, repsMax, reason };
}

/** Saves the accepted changes; an empty list restores the original workout. */
export function saveAdjustmentChanges(checkinId: string, changes: readonly ProposedChange[]): Promise<JsonRequestResult> {
  return sendJsonRequest(adjustmentEndpoint(checkinId), "PUT", { changes: changes.map(toChange) }, translate("readiness.adjustment.saveFailed"));
}
