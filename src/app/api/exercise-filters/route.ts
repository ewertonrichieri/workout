import { createServerExerciseCatalogService } from "@/lib/catalog/exercises/server-exercise-catalog";
import { respondWithJson } from "@/lib/http/api-handler";
import { createServerLogger } from "@/lib/http/server-logger";

/** GET /api/exercise-filters — muscles and equipment available for filtering. */
export async function GET() {
  return respondWithJson({ route: "/api/exercise-filters", logger: createServerLogger() }, async () => {
    const service = await createServerExerciseCatalogService();
    return service.listFilters();
  });
}
