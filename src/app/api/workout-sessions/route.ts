import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { HTTP_STATUS } from "@/lib/constants/http";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { respondWithJson } from "@/lib/http/api-handler";
import { createServerLogger } from "@/lib/http/server-logger";
import { translate } from "@/lib/i18n/translate";
import { createServerSessionService } from "@/lib/training/server-session-service";

async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new InvalidInputError(translate("errors.invalidInput"));
    throw error;
  }
}

/** POST /api/workout-sessions — "Finalizar treino": saves the session and its checked sets. */
export async function POST(request: NextRequest) {
  const context = { route: "/api/workout-sessions", logger: createServerLogger(), successStatus: HTTP_STATUS.CREATED };
  return respondWithJson(context, async () => {
    const userId = await getAuthenticatedUserId();
    const service = await createServerSessionService();
    return service.finishWorkout(userId, await readJsonBody(request));
  });
}
