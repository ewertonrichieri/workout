"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildExerciseDetailHref } from "@/components/exercises/exercise-search-href";
import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import type { TechniqueRuleSet } from "@/lib/constants/technique";
import { TECHNIQUE_SCORE_MAX } from "@/lib/constants/technique-analysis";
import { TECHNIQUE_RULES_CALIBRATED } from "@/lib/constants/technique-rules";
import { getMovementPattern } from "@/lib/technique/patterns/movement-patterns";
import type { MovementPattern } from "@/lib/technique/patterns/pattern-types";
import { buildReplayMarkers, type TechniqueReplay } from "@/lib/technique/replay";
import { buildTechniqueSummary, type RepAssessment, type TechniqueSummary } from "@/lib/technique/technique-summary";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { translate } from "@/lib/i18n/translate";
import { TechniqueAnalysisPanel } from "./technique-analysis-panel";
import { TechniqueReplayView } from "./technique-replay-view";
import { describeIssue, describeRepCount, describeRepMeasures } from "./technique-summary-labels";
import { useTechniqueAnalysis } from "./use-technique-analysis";

interface RepContext {
  pattern: MovementPattern;
  /** First evaluated rep: reference of the relative rules (D13). */
  reference: TechniqueRep | undefined;
}

function RepMeasures({ assessment, context }: { assessment: RepAssessment; context: RepContext }) {
  const { rep, issues } = assessment;
  if (!rep.isEvaluated) return <p className="text-sm text-muted">{translate("technique.summary.notEvaluated")}</p>;
  return (
    <>
      <ul className="flex flex-col gap-1 text-sm">
        {describeRepMeasures(context.pattern.id, rep).map((line) => <li key={line}>{line}</li>)}
      </ul>
      {issues.length === 0 ? (
        <p className="text-sm text-accent-strong">{translate("technique.summary.noIssues")}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm font-medium">
          {issues.map((issue) => <li key={issue.issue}>{describeIssue(context.pattern, issue, rep, context.reference)}</li>)}
        </ul>
      )}
    </>
  );
}

interface RepCardProps {
  assessment: RepAssessment;
  context: RepContext;
  /** AI score of this rep, once the analysis arrives. */
  score: number | null;
}

function RepCard({ assessment, context, score }: RepCardProps) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <h3 className="font-semibold">{translate("technique.summary.repTitle", { number: assessment.rep.repNumber })}</h3>
      {score !== null && <p className="text-sm font-semibold text-accent-strong">{translate("technique.analysis.repScore", { score, max: TECHNIQUE_SCORE_MAX })}</p>}
      <RepMeasures assessment={assessment} context={context} />
    </li>
  );
}

function SummaryNotices({ repCount, needsRerecord }: { repCount: number; needsRerecord: boolean }) {
  if (needsRerecord) return <p role="alert" className="font-medium">{translate(repCount === 0 ? "technique.summary.noReps" : "technique.summary.rerecord")}</p>;
  return (
    <>
      {!TECHNIQUE_RULES_CALIBRATED && <p className="text-sm text-muted">{translate("technique.summary.calibrationNotice")}</p>}
      <p className="text-sm text-muted">{translate("technique.summary.estimateNotice")}</p>
    </>
  );
}

function repsNeedingCorrection(summary: TechniqueSummary): Set<number> {
  return new Set(summary.reps.filter(({ issues }) => issues.some((item) => item.severity !== "info")).map(({ rep }) => rep.repNumber));
}

interface TechniqueSummaryViewProps {
  reps: readonly TechniqueRep[];
  /** In-memory recording; null when the browser cannot record. */
  replay: TechniqueReplay | null;
  exerciseSlug: string;
  ruleSet: TechniqueRuleSet;
  onRecordAgain: () => void;
}

function useSummaryData({ reps, replay, exerciseSlug, ruleSet }: Omit<TechniqueSummaryViewProps, "onRecordAgain">) {
  const pattern = getMovementPattern(ruleSet.id);
  const summary = useMemo(() => buildTechniqueSummary(pattern, reps, TECHNIQUE_RULES_CALIBRATED), [pattern, reps]);
  const markers = useMemo(() => (replay ? buildReplayMarkers(reps, replay.startedAtMs, repsNeedingCorrection(summary)) : []), [reps, replay, summary]);
  const analysis = useTechniqueAnalysis({ reps, exerciseSlug, cameraView: ruleSet.cameraView, isEnabled: !summary.needsRerecord });
  const scores = new Map(analysis.state.status === "success" ? analysis.state.result.reps.map((rep) => [rep.repNumber, rep.score]) : []);
  const context: RepContext = { pattern, reference: summary.reference };
  return { summary, markers, analysis, scores, context };
}

/** Summary after the set (steps 5.2–5.4): AI analysis, replay and the numbers of each rep. Camera already off. */
export function TechniqueSummaryView(props: TechniqueSummaryViewProps) {
  const { summary, markers, analysis, scores, context } = useSummaryData(props);
  return (
    <section aria-labelledby="technique-summary-title" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <h2 id="technique-summary-title" className="text-lg font-semibold">{translate("technique.summary.title")}</h2>
      <p className="text-2xl font-semibold">{describeRepCount(summary.repCount)}</p>
      <SummaryNotices repCount={summary.repCount} needsRerecord={summary.needsRerecord} />
      <TechniqueAnalysisPanel state={analysis.state} onRetry={analysis.retry} />
      {props.replay ? <TechniqueReplayView replay={props.replay} markers={markers} /> : summary.repCount > 0 && <p className="text-sm text-muted">{translate("technique.replay.unavailable")}</p>}
      {summary.repCount > 0 && (
        <ol className="flex flex-col gap-2">
          {summary.reps.map((assessment) => (
            <RepCard key={assessment.rep.repNumber} assessment={assessment} context={context} score={scores.get(assessment.rep.repNumber) ?? null} />
          ))}
        </ol>
      )}
      <button type="button" onClick={props.onRecordAgain} className={PRIMARY_BUTTON_CLASS}>{translate("technique.summary.recordAgain")}</button>
      {analysis.state.status === "success" && (
        <Link href={`${buildExerciseDetailHref(props.exerciseSlug)}#tecnica`} className="flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
          {translate("technique.summary.historyLink")}
        </Link>
      )}
    </section>
  );
}
