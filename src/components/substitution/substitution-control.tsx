"use client";

import { useState } from "react";
import { ReadinessOptionGroup } from "@/components/readiness/readiness-option-group";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { SUBSTITUTION_REASONS, type SubstitutionReason } from "@/lib/constants/substitution";
import { translate } from "@/lib/i18n/translate";
import type { DraftSubstitution, SubstitutionResult } from "@/lib/substitution/substitution-schema";
import type { WorkoutExercise } from "@/lib/training/plan-types";
import { requestSubstitutes } from "./substitution-request";
import { SubstitutionSuggestions } from "./substitution-suggestions";

interface SubstitutionControlProps {
  workoutExercise: WorkoutExercise;
  /** Exercises shown today, left out of the options. */
  excludeSlugs: readonly string[];
  onChange: (substitution: DraftSubstitution | null) => void;
}

type SearchStep =
  | { name: "choosing" }
  | { name: "loading" }
  | { name: "results"; result: SubstitutionResult }
  | { name: "error"; message: string };

const REASON_OPTIONS = SUBSTITUTION_REASONS.map((value) => ({ value, label: translate(`training.substitution.reasons.${value}`) }));
const PANEL_CLASS = "flex flex-col gap-3 rounded-lg border border-border p-3";

function SearchFeedback({ step, onChoose }: { step: SearchStep; onChoose: (exercise: DraftSubstitution["exercise"]) => void }) {
  if (step.name === "loading") return <p role="status" aria-busy="true">{translate("training.substitution.searching")}</p>;
  if (step.name === "error") return <p role="alert" className="font-medium text-accent-strong">{step.message}</p>;
  if (step.name === "results") return <SubstitutionSuggestions result={step.result} onChoose={onChoose} />;
  return null;
}

/** Optional reason, then the AI (or automatic) options; choosing one swaps the exercise for today. */
function SwapPanel({ workoutExercise, excludeSlugs, onChange, onClose }: SubstitutionControlProps & { onClose: () => void }) {
  const [reason, setReason] = useState<SubstitutionReason | null>(null);
  const [step, setStep] = useState<SearchStep>({ name: "choosing" });
  const search = async () => {
    setStep({ name: "loading" });
    const result = await requestSubstitutes(workoutExercise.id, { reason, excludeSlugs: [...excludeSlugs] });
    setStep(result.ok ? { name: "results", result: result.data } : { name: "error", message: result.message });
  };
  const changeReason = (next: SubstitutionReason) => {
    setReason(next);
    setStep({ name: "choosing" });
  };
  return (
    <section aria-label={translate("training.substitution.panelLabel", { name: workoutExercise.exercise.name })} className={PANEL_CLASS}>
      <ReadinessOptionGroup legend={translate("training.substitution.reasonLegend")} name={`swap-${workoutExercise.id}`} options={REASON_OPTIONS} selected={reason} onSelect={changeReason} />
      <SearchFeedback step={step} onChoose={(exercise) => onChange({ exercise, reason })} />
      <div className="flex flex-wrap gap-2">
        {step.name !== "results" && (
          <button type="button" onClick={() => void search()} disabled={step.name === "loading"} className={PRIMARY_BUTTON_CLASS}>{translate("training.substitution.searchButton")}</button>
        )}
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>{translate("training.substitution.cancelButton")}</button>
      </div>
    </section>
  );
}

/** "Trocar exercício" (step 3B.4); a swapped exercise offers "Desfazer troca" instead. */
export function SubstitutionControl(props: SubstitutionControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (props.workoutExercise.dailyChange?.changeType === "substituted") {
    return <button type="button" onClick={() => props.onChange(null)} className={SECONDARY_BUTTON_CLASS}>{translate("training.substitution.undoButton")}</button>;
  }
  if (!isOpen) return <button type="button" onClick={() => setIsOpen(true)} className={SECONDARY_BUTTON_CLASS}>{translate("training.substitution.openButton")}</button>;
  return <SwapPanel {...props} onClose={() => setIsOpen(false)} />;
}
