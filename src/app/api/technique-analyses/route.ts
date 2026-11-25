import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { TECHNIQUE_ANALYSES_ENDPOINT } from "@/lib/constants/technique-analysis";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerTechniqueAnalysisService } from "@/lib/technique-analysis/server-technique-analysis-service";

/** Must be a literal (static analysis): AI_TOTAL_TIMEOUT_MS (120 s) plus database and network headroom. */
export const maxDuration = 130;

/** POST /api/technique-analyses — AI explanation of a set measured on the phone (step 5.4); only numbers arrive here. */
export async function POST(request: NextRequest) {
  const context = { route: TECHNIQUE_ANALYSES_ENDPOINT, logger: createServerLogger(), successStatus: HTTP_STATUS.CREATED };
  return respondWithJson(context, async () => {
    const userId = await getAuthenticatedUserId();
    const service = await createServerTechniqueAnalysisService();
    return service.analyze(userId, await readJsonBody(request));
  });
}
