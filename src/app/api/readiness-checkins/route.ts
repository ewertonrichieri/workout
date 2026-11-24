import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerReadinessService } from "@/lib/readiness/server-readiness-service";

/** POST /api/readiness-checkins — pre-workout check-in (step 3B.1) of the signed-in user. */
export async function POST(request: NextRequest) {
  const context = { route: "/api/readiness-checkins", logger: createServerLogger(), successStatus: HTTP_STATUS.CREATED };
  return respondWithJson(context, async () => {
    const userId = await getAuthenticatedUserId();
    const service = await createServerReadinessService();
    return service.saveCheckin(userId, await readJsonBody(request));
  });
}
