import type { NextRequest } from "next/server";
import { createServerExerciseCatalogService } from "@/lib/catalog/exercises/server-exercise-catalog";
import { respondWithJson } from "@/lib/http/api-handler";
import { createServerLogger } from "@/lib/http/server-logger";

/** GET /api/exercises?q=&muscle=&equipment=&page=&pageSize= — paginated catalog search. */
export async function GET(request: NextRequest) {
  return respondWithJson({ route: "/api/exercises", logger: createServerLogger() }, async () => {
    const service = await createServerExerciseCatalogService();
    return service.searchExercises(Object.fromEntries(request.nextUrl.searchParams));
  });
}
