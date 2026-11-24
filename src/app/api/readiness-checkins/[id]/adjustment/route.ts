import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerAdjustmentService } from "@/lib/readiness/server-adjustment-service";

type AdjustmentRouteContext = RouteContext<"/api/readiness-checkins/[id]/adjustment">;

const ROUTE = "/api/readiness-checkins/[id]/adjustment";

/** Must be a literal (static analysis): AI_TOTAL_TIMEOUT_MS (120 s) plus database and network headroom. */
export const maxDuration = 130;

/** POST — asks the AI for today's adjustment of the check-in (step 3B.2); nothing is saved. */
export async function POST(_request: NextRequest, { params }: AdjustmentRouteContext) {
  return respondWithJson({ route: ROUTE, logger: createServerLogger() }, async () => {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    const service = await createServerAdjustmentService();
    return service.proposeAdjustment(userId, id);
  });
}

/** PUT — saves the accepted changes ({ changes }); an empty list restores the original workout. */
export async function PUT(request: NextRequest, { params }: AdjustmentRouteContext) {
  return respondWithJson({ route: ROUTE, logger: createServerLogger() }, async () => {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    const service = await createServerAdjustmentService();
    return service.saveAdjustment(userId, id, await readJsonBody(request));
  });
}
