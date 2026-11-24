import type { NextRequest } from "next/server";
import { createServerAssessmentService } from "@/lib/assessment/server-assessment-service";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";

/** POST /api/assessments — saves a new assessment (anamnese) of the signed-in user. */
export async function POST(request: NextRequest) {
  const context = { route: "/api/assessments", logger: createServerLogger(), successStatus: HTTP_STATUS.CREATED };
  return respondWithJson(context, async () => {
    await getAuthenticatedUserId();
    const service = await createServerAssessmentService();
    return service.saveAssessment(await readJsonBody(request));
  });
}
