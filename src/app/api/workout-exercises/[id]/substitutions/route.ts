import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerSubstitutionService } from "@/lib/substitution/server-substitution-service";

/** Must be a literal (static analysis): AI_TOTAL_TIMEOUT_MS (120 s) plus database and network headroom. */
export const maxDuration = 130;

/** POST /api/workout-exercises/:id/substitutions — equivalent exercises for today ({ reason, excludeSlugs }). */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/workout-exercises/[id]/substitutions">) {
  return respondWithJson({ route: "/api/workout-exercises/[id]/substitutions", logger: createServerLogger() }, async () => {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    const service = await createServerSubstitutionService();
    return service.suggestSubstitutes(userId, id, await readJsonBody(request));
  });
}
