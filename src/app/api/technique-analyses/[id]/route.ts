import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { TECHNIQUE_ANALYSES_ENDPOINT } from "@/lib/constants/technique-analysis";
import { respondWithJson } from "@/lib/http/api-handler";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerTechniqueHistoryService } from "@/lib/technique-analysis/server-technique-history-service";

/** DELETE /api/technique-analyses/:id — removes one analysis of the user from the history (decision D9). */
export async function DELETE(_request: NextRequest, context: RouteContext<"/api/technique-analyses/[id]">) {
  return respondWithJson({ route: `${TECHNIQUE_ANALYSES_ENDPOINT}/[id]`, logger: createServerLogger() }, async () => {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const service = await createServerTechniqueHistoryService();
    return service.deleteAnalysis(userId, id);
  });
}
