import { translate } from "@/lib/i18n/translate";
import type { PlanValidity } from "@/lib/training/plan-types";
import { describeValidity, describeValidityProgress } from "./workout-labels";

interface PlanValiditySummaryProps {
  validity: PlanValidity;
  validUntil: string;
}

const PERCENT_MAX = 100;

/** Plan validity with an honest progress bar of the elapsed period. */
export function PlanValiditySummary({ validity, validUntil }: PlanValiditySummaryProps) {
  const { percent, text } = describeValidityProgress(validity.progress);
  return (
    <section className="flex flex-col gap-2">
      <p className={validity.isExpired ? "font-semibold text-accent-strong" : "text-muted"}>{describeValidity(validity, validUntil)}</p>
      <div
        role="progressbar"
        aria-label={translate("training.validityProgressLabel")}
        aria-valuemin={0}
        aria-valuemax={PERCENT_MAX}
        aria-valuenow={percent}
        aria-valuetext={text}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full bg-accent-strong" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
