import { ExerciseCover } from "@/components/exercises/exercise-cover";
import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { translate } from "@/lib/i18n/translate";
import type { SubstitutionResult } from "@/lib/substitution/substitution-schema";
import type { PlannedExerciseInfo } from "@/lib/training/plan-types";

interface SubstitutionSuggestionsProps {
  result: SubstitutionResult;
  onChoose: (exercise: PlannedExerciseInfo) => void;
}

/** Up to 3 options, best first; automatic ones are flagged as such (never presented as certain). */
export function SubstitutionSuggestions({ result, onChoose }: SubstitutionSuggestionsProps) {
  return (
    <div className="flex flex-col gap-2">
      {result.isAutomatic && <p role="note" className="text-sm text-muted">{translate("training.substitution.automaticNotice")}</p>}
      <ul aria-label={translate("training.substitution.suggestionsLabel")} className="flex flex-col gap-2">
        {result.suggestions.map(({ exercise, reason }) => (
          <li key={exercise.slug} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <ExerciseCover media={exercise.coverMedia} />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold">{exercise.name}</p>
                {reason && <p className="text-sm text-muted">{reason}</p>}
              </div>
            </div>
            <button type="button" onClick={() => onChoose(exercise)} className={PRIMARY_BUTTON_CLASS}>
              {translate("training.substitution.chooseButton", { name: exercise.name })}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
