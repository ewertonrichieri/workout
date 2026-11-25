import { z } from "zod";
import { TECHNIQUE_HISTORY_PAGE_SIZE } from "@/lib/constants/technique-analysis";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { findTechniqueRuleSet } from "@/lib/technique/technique-support";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import type { TechniqueHistoryRepository } from "./technique-history-repository";
import type { TechniqueHistoryEntry } from "./technique-history-schema";

export interface TechniqueHistoryPage {
  items: TechniqueHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TechniqueHistoryService {
  listHistory(userId: string, rawQuery: Record<string, string | undefined>): Promise<TechniqueHistoryPage>;
  deleteAnalysis(userId: string, rawId: string): Promise<{ id: string }>;
}

const historyQuerySchema = z.object({
  exercise: z.string().min(1).refine((slug) => findTechniqueRuleSet(slug) !== undefined),
  page: z.coerce.number().int().min(1).default(1),
});

/** Technique history per exercise (step 5.5) and deletion (decision D9; the screen offers "Desfazer" before calling it). */
export function createTechniqueHistoryService({ repository }: { repository: TechniqueHistoryRepository }): TechniqueHistoryService {
  return {
    async listHistory(userId, rawQuery) {
      const query = historyQuerySchema.safeParse(rawQuery);
      if (!query.success) throw new InvalidInputError(translate("errors.invalidInput"));
      const pagination = { page: query.data.page, pageSize: TECHNIQUE_HISTORY_PAGE_SIZE };
      const { items, total } = await repository.listAnalyses(userId, query.data.exercise, pagination);
      const entries = items.map((item) => ({ ...item, date: toDateInTimeZone(new Date(item.createdAt), APP_TIME_ZONE) }));
      return { items: entries, total, ...pagination };
    },
    async deleteAnalysis(userId, rawId) {
      const id = z.uuid().safeParse(rawId);
      if (!id.success) throw new InvalidInputError(translate("errors.invalidInput"));
      const wasDeleted = await repository.deleteAnalysis(userId, id.data);
      if (!wasDeleted) throw new NotFoundError(translate("errors.notFound", { resource: translate("technique.history.resource") }));
      return { id: id.data };
    },
  };
}
