import { TECHNIQUE_ANALYSES_ENDPOINT } from "@/lib/constants/technique-analysis";
import type { CameraView } from "@/lib/constants/technique";
import { sendJsonRequestForData, type JsonDataRequestResult } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { techniqueAnalysisResultSchema, type TechniqueAnalysisResult } from "@/lib/technique-analysis/analysis-schema";
import { toRepMetrics } from "@/lib/technique-analysis/rep-metrics";
import type { TechniqueRep } from "@/lib/technique/pose-rep-tracker";

export interface AnalysisRequest {
  reps: readonly TechniqueRep[];
  exerciseSlug: string;
  cameraView: CameraView;
}

/** Sends only the numbers of each rep (decision D6); never throws, failures become a pt-BR message. */
export function requestTechniqueAnalysis({ reps, exerciseSlug, cameraView }: AnalysisRequest): Promise<JsonDataRequestResult<TechniqueAnalysisResult>> {
  const body = { exerciseSlug, cameraView, reps: reps.map(toRepMetrics) };
  return sendJsonRequestForData(TECHNIQUE_ANALYSES_ENDPOINT, "POST", body, techniqueAnalysisResultSchema, translate("technique.analysis.failed"));
}
