import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerWorkoutExerciseService } from "@/lib/training/server-workout-exercise-service";

/** PATCH /api/workout-exercises/:id — "Salvar carga para progredir" toggle ({ trackProgression }). */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/workout-exercises/[id]">) {
  return respondWithJson({ route: "/api/workout-exercises/[id]", logger: createServerLogger() }, async () => {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    const service = await createServerWorkoutExerciseService();
    return service.setTrackProgression(userId, id, await readJsonBody(request));
  });
}
