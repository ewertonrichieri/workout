import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { CameraView } from "@/lib/constants/technique";
import type { TechniqueIssue } from "@/lib/constants/technique-rules";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { RepIssue } from "@/lib/technique/rep-rules";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { toRepMetrics } from "./rep-metrics";

/** One finished analysis (decision D9: only analyses the AI completed are saved). */
export interface TechniqueAnalysisRecord {
  exerciseId: string;
  cameraView: CameraView;
  overallScore: number;
  mainTip: string;
  reps: Array<{ rep: TechniqueRep; score: number | null; issues: RepIssue[] }>;
  strengths: string[];
  corrections: Array<{ issue: TechniqueIssue; repNumbers: number[]; text: string }>;
}

export interface TechniqueAnalysisRepository {
  /** Saves the analysis, its reps, issues and feedback atomically; returns the new id. */
  saveAnalysis(record: TechniqueAnalysisRecord): Promise<string>;
}

const SAVE_FUNCTION = "save_technique_analysis";
const analysisIdSchema = z.uuid();

function toRepRows(reps: TechniqueAnalysisRecord["reps"]) {
  return reps.map(({ rep, score, issues }) => {
    const metrics = toRepMetrics(rep);
    return {
      rep_number: metrics.repNumber,
      score,
      is_evaluated: rep.isEvaluated,
      duration_ms: metrics.durationMs,
      descent_ms: metrics.descentMs,
      metrics: metrics.metrics,
      issues: issues.map((item) => ({ issue: item.issue, severity: item.severity })),
    };
  });
}

function toFeedbackRows(record: TechniqueAnalysisRecord) {
  const strengths = record.strengths.map((text, index) => ({ kind: "strength", position: index + 1, issue: null, text }));
  const corrections = record.corrections.map((item, index) => ({ kind: "correction", position: index + 1, issue: item.issue, text: item.text }));
  return [...strengths, ...corrections];
}

/** Writes through the user's Supabase session (RLS applies inside the function). */
export function createSupabaseTechniqueAnalysisRepository(client: SupabaseClient): TechniqueAnalysisRepository {
  return {
    async saveAnalysis(record) {
      const { data, error } = await client.rpc(SAVE_FUNCTION, {
        p_exercise_id: record.exerciseId,
        p_camera_view: record.cameraView,
        p_overall_score: record.overallScore,
        p_main_tip: record.mainTip,
        p_reps: toRepRows(record.reps),
        p_feedback: toFeedbackRows(record),
      });
      const analysisId = analysisIdSchema.safeParse(data);
      if (error || !analysisId.success) throw new RepositoryError(translate("errors.internal"), "technique.saveAnalysis");
      return analysisId.data;
    },
  };
}
