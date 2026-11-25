import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { APP_LOCALE } from "@/lib/constants/training";
import { TECHNIQUE_SCORE_MAX } from "@/lib/constants/technique-analysis";
import type { TechniqueAnalysisResult } from "@/lib/technique-analysis/analysis-schema";
import { translate } from "@/lib/i18n/translate";
import type { AnalysisState } from "./use-technique-analysis";

const listFormatter = new Intl.ListFormat(APP_LOCALE, { style: "long", type: "conjunction" });

/** "(2ª e 3ª repetições)" for the reps of a correction. */
export function describeRepNumbers(repNumbers: readonly number[]): string {
  const reps = listFormatter.format(repNumbers.map((number) => translate("technique.analysis.ordinal", { number })));
  return translate(repNumbers.length === 1 ? "technique.analysis.repsOne" : "technique.analysis.repsOther", { reps });
}

function FeedbackList({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="font-semibold">{title}</h4>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function AnalysisResult({ result }: { result: TechniqueAnalysisResult }) {
  const corrections = result.corrections.map((item) => (item.repNumbers.length > 0 ? `${item.text} ${describeRepNumbers(item.repNumbers)}` : item.text));
  return (
    <>
      <p className="text-2xl font-semibold">{translate("technique.analysis.score", { score: result.overallScore, max: TECHNIQUE_SCORE_MAX })}</p>
      <div className="flex flex-col gap-1 rounded-xl border border-accent-strong p-3">
        <h4 className="font-semibold text-accent-strong">{translate("technique.analysis.mainTip")}</h4>
        <p>{result.mainTip}</p>
      </div>
      <FeedbackList title={translate("technique.analysis.strengths")} items={result.strengths} />
      <FeedbackList title={translate("technique.analysis.corrections")} items={corrections} />
      {result.hasLimitations && <p className="text-sm font-medium">{translate("technique.analysis.limitationsNotice")}</p>}
    </>
  );
}

/** AI explanation of the set (step 5.4): loading, result, or a failure that keeps the local summary usable. */
export function TechniqueAnalysisPanel({ state, onRetry }: { state: AnalysisState; onRetry: () => void }) {
  if (state.status === "idle") return null;
  return (
    <section aria-labelledby="technique-analysis-title" aria-busy={state.status === "loading"} className="flex flex-col gap-3">
      <h3 id="technique-analysis-title" className="text-lg font-semibold">{translate("technique.analysis.title")}</h3>
      {state.status === "loading" && <p role="status" className="animate-pulse text-muted">{translate("technique.analysis.loading")}</p>}
      {state.status === "success" && <AnalysisResult result={state.result} />}
      {state.status === "error" && (
        <div role="alert" className="flex flex-col gap-2">
          <p>{state.message}</p>
          <button type="button" onClick={onRetry} className={`${PRIMARY_BUTTON_CLASS} self-start`}>{translate("technique.analysis.retry")}</button>
        </div>
      )}
    </section>
  );
}
