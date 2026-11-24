import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerPlanGenerationService } from "@/lib/plan-generation/server-plan-generation-service";

/** Must be a literal (static analysis): AI_TOTAL_TIMEOUT_MS (120 s) plus database and network headroom. */
export const maxDuration = 130;

/** POST /api/plans — generates a plan with AI from the latest assessment and saves it as the active plan. */
export async function POST(request: NextRequest) {
  const context = { route: "/api/plans", logger: createServerLogger(), successStatus: HTTP_STATUS.CREATED };
  return respondWithJson(context, async () => {
    const userId = await getAuthenticatedUserId();
    const service = await createServerPlanGenerationService();
    return service.generatePlan(userId, await readJsonBody(request));
  });
}
