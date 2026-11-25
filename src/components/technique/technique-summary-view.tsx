import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { SQUAT_RULES_CALIBRATED } from "@/lib/constants/technique-rules";
import { buildTechniqueSummary, type RepAssessment } from "@/lib/technique/technique-summary";
import type { TechniqueRep } from "@/lib/technique/pose-rep-tracker";
import { translate } from "@/lib/i18n/translate";
import { describeDepth, describeDescent, describeIssue, describeRepCount, describeTrunk } from "./technique-summary-labels";

function RepMeasures({ assessment, referenceTrunkLean }: { assessment: RepAssessment; referenceTrunkLean: number | null }) {
  const { rep, issues } = assessment;
  if (!rep.isEvaluated) return <p className="text-sm text-muted">{translate("technique.summary.notEvaluated")}</p>;
  return (
    <>
      <ul className="flex flex-col gap-1 text-sm">
        <li>{describeDepth(rep)}</li>
        <li>{describeTrunk(rep)}</li>
        <li>{describeDescent(rep)}</li>
      </ul>
      {issues.length === 0 ? (
        <p className="text-sm text-accent-strong">{translate("technique.summary.noIssues")}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm font-medium">
          {issues.map((issue) => <li key={issue.issue}>{describeIssue(issue, rep, referenceTrunkLean)}</li>)}
        </ul>
      )}
    </>
  );
}

function RepCard({ assessment, referenceTrunkLean }: { assessment: RepAssessment; referenceTrunkLean: number | null }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <h3 className="font-semibold">{translate("technique.summary.repTitle", { number: assessment.rep.repNumber })}</h3>
      <RepMeasures assessment={assessment} referenceTrunkLean={referenceTrunkLean} />
    </li>
  );
}

function SummaryNotices({ repCount, needsRerecord }: { repCount: number; needsRerecord: boolean }) {
  if (needsRerecord) return <p role="alert" className="font-medium">{translate(repCount === 0 ? "technique.summary.noReps" : "technique.summary.rerecord")}</p>;
  return (
    <>
      {!SQUAT_RULES_CALIBRATED && <p className="text-sm text-muted">{translate("technique.summary.calibrationNotice")}</p>}
      <p className="text-sm text-muted">{translate("technique.summary.estimateNotice")}</p>
    </>
  );
}

/** Local summary right after the set (step 5.2); the AI analysis and the replay come in 5.4. Camera already off. */
export function TechniqueSummaryView({ reps, onRecordAgain }: { reps: readonly TechniqueRep[]; onRecordAgain: () => void }) {
  const summary = buildTechniqueSummary(reps, SQUAT_RULES_CALIBRATED);
  return (
    <section aria-labelledby="technique-summary-title" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 id="technique-summary-title" className="text-lg font-semibold">{translate("technique.summary.title")}</h2>
      <p className="text-2xl font-semibold">{describeRepCount(summary.repCount)}</p>
      <SummaryNotices repCount={summary.repCount} needsRerecord={summary.needsRerecord} />
      {summary.repCount > 0 && (
        <ol className="flex flex-col gap-2">
          {summary.reps.map((assessment) => <RepCard key={assessment.rep.repNumber} assessment={assessment} referenceTrunkLean={summary.referenceTrunkLean} />)}
        </ol>
      )}
      {!summary.needsRerecord && <p className="text-sm text-muted">{translate("technique.summary.aiNextStep")}</p>}
      <button type="button" onClick={onRecordAgain} className={PRIMARY_BUTTON_CLASS}>{translate("technique.summary.recordAgain")}</button>
    </section>
  );
}
