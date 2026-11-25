import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MAX_FREQUENT_ISSUES } from "@/lib/constants/technique-analysis";
import { ISSUE_SEVERITIES, TECHNIQUE_ISSUES, type TechniqueIssue } from "@/lib/constants/technique-rules";
import type { TechniqueHistoryItem } from "./technique-history-schema";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

export type { TechniqueHistoryItem };

export interface TechniqueHistoryRepository {
  listAnalyses(userId: string, exerciseSlug: string, pagination: { page: number; pageSize: number }): Promise<{ items: TechniqueHistoryItem[]; total: number }>;
  /** True when the analysis existed and was deleted (its reps, issues and feedback go with it). */
  deleteAnalysis(userId: string, analysisId: string): Promise<boolean>;
}

const ANALYSIS_COLUMNS = "id, created_at, overall_score, rep_count, evaluated_rep_count, main_tip, exercises!inner(slug), technique_reps(technique_rep_issues(issue, severity))";

const analysisRowsSchema = z.array(z.object({
  id: z.uuid(),
  created_at: z.string(),
  overall_score: z.number().int(),
  rep_count: z.number().int(),
  evaluated_rep_count: z.number().int(),
  main_tip: z.string(),
  technique_reps: z.array(z.object({ technique_rep_issues: z.array(z.object({ issue: z.enum(TECHNIQUE_ISSUES), severity: z.enum(ISSUE_SEVERITIES) })) })),
}));
type AnalysisRow = z.infer<typeof analysisRowsSchema>[number];

function failure(operation: string): RepositoryError {
  return new RepositoryError(translate("errors.internal"), operation);
}

function countFrequentIssues(row: AnalysisRow): TechniqueHistoryItem["frequentIssues"] {
  const counts = new Map<TechniqueIssue, number>();
  row.technique_reps.flatMap((rep) => rep.technique_rep_issues).filter((item) => item.severity !== "info")
    .forEach((item) => counts.set(item.issue, (counts.get(item.issue) ?? 0) + 1));
  return [...counts].map(([issue, repCount]) => ({ issue, repCount })).sort((first, second) => second.repCount - first.repCount).slice(0, MAX_FREQUENT_ISSUES);
}

function toItem(row: AnalysisRow): TechniqueHistoryItem {
  return {
    id: row.id, createdAt: row.created_at, overallScore: row.overall_score, repCount: row.rep_count,
    evaluatedRepCount: row.evaluated_rep_count, mainTip: row.main_tip, frequentIssues: countFrequentIssues(row),
  };
}

/** Reads and deletes through the user's session (RLS) and also filters by the user explicitly. */
export function createSupabaseTechniqueHistoryRepository(client: SupabaseClient): TechniqueHistoryRepository {
  return {
    async listAnalyses(userId, exerciseSlug, { page, pageSize }) {
      const from = (page - 1) * pageSize;
      const { data, error, count } = await client.from("technique_analyses").select(ANALYSIS_COLUMNS, { count: "exact" })
        .eq("user_id", userId).eq("exercises.slug", exerciseSlug).order("created_at", { ascending: false }).range(from, from + pageSize - 1);
      const rows = analysisRowsSchema.safeParse(data);
      if (error || !rows.success) throw failure("technique.listAnalyses");
      return { items: rows.data.map(toItem), total: count ?? rows.data.length };
    },
    async deleteAnalysis(userId, analysisId) {
      const { data, error } = await client.from("technique_analyses").delete().eq("id", analysisId).eq("user_id", userId).select("id");
      const rows = z.array(z.object({ id: z.uuid() })).safeParse(data);
      if (error || !rows.success) throw failure("technique.deleteAnalysis");
      return rows.data.length > 0;
    },
  };
}
