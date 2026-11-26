import Link from "next/link";
import type { ReactNode } from "react";
import { buildProgressHref } from "@/components/history/history-labels";
import { AnalyzeTechniqueLink } from "@/components/technique/analyze-technique-link";
import { translate } from "@/lib/i18n/translate";
import type { PlannedExerciseInfo } from "@/lib/training/plan-types";
import { ExerciseDemoDisclosure } from "./exercise-demo-disclosure";

interface ExerciseMoreOptionsProps {
  exercise: PlannedExerciseInfo;
  /** Card-specific controls (swap, "Salvar carga para progredir"), rendered after the demonstration. */
  children?: ReactNode;
}

const FOCUS_CLASS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";
const SUMMARY_CLASS = `flex min-h-11 cursor-pointer items-center font-medium text-accent-strong ${FOCUS_CLASS}`;
const PROGRESS_LINK_CLASS = `flex min-h-11 items-center self-start font-medium text-accent-strong ${FOCUS_CLASS}`;

/** Secondary actions of a workout card, closed by default (spec 015). */
export function ExerciseMoreOptions({ exercise, children }: ExerciseMoreOptionsProps) {
  return (
    <details className="border-t border-border pt-1">
      <summary aria-label={translate("training.moreOptionsLabel", { name: exercise.name })} className={SUMMARY_CLASS}>
        {translate("training.moreOptions")}
      </summary>
      <div className="flex flex-col gap-2 pt-2">
        <ExerciseDemoDisclosure exercise={exercise} />
        {children}
        <AnalyzeTechniqueLink exerciseSlug={exercise.slug} />
        <Link href={buildProgressHref(exercise.slug)} className={PROGRESS_LINK_CLASS}>
          {translate("history.progressLink")}
        </Link>
      </div>
    </details>
  );
}
