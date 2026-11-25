import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createSupabaseTechniqueHistoryRepository } from "./technique-history-repository";
import { createTechniqueHistoryService, type TechniqueHistoryService } from "./technique-history-service";

/** Composition root for the technique history (step 5.5). */
export async function createServerTechniqueHistoryService(): Promise<TechniqueHistoryService> {
  return createTechniqueHistoryService({ repository: createSupabaseTechniqueHistoryRepository(await createServerSupabaseClient()) });
}
