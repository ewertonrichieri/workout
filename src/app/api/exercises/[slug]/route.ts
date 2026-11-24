import type { NextRequest } from "next/server";
import { createServerExerciseCatalogService } from "@/lib/catalog/exercises/server-exercise-catalog";
import { respondWithJson } from "@/lib/http/api-handler";
import { createServerLogger } from "@/lib/http/server-logger";

/** GET /api/exercises/:slug — one exercise with muscles, equipment and media. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/exercises/[slug]">) {
  return respondWithJson({ route: "/api/exercises/[slug]", logger: createServerLogger() }, async () => {
    const { slug } = await context.params;
    const service = await createServerExerciseCatalogService();
    return service.getExercise(slug);
  });
}
