import type { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { respondWithJson } from "@/lib/http/api-handler";
import { readJsonBody } from "@/lib/http/read-json-body";
import { createServerLogger } from "@/lib/http/server-logger";
import { createServerWorkoutEditService } from "@/lib/training/server-workout-edit-service";

/** PUT /api/workouts/:id/exercises — replaces the exercise list of a workout of the active plan (step 3.4). */
export async function PUT(request: NextRequest, { params }: RouteContext<"/api/workouts/[id]/exercises">) {
  return respondWithJson({ route: "/api/workouts/[id]/exercises", logger: createServerLogger() }, async () => {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    const service = await createServerWorkoutEditService();
    return service.saveWorkoutExercises(userId, id, await readJsonBody(request));
  });
}
