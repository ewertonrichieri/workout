"use client";

import { useState } from "react";
import { SET_EFFORTS, type SetEffort } from "@/lib/constants/training";
import { translate } from "@/lib/i18n/translate";

interface SetEffortChoiceProps {
  /** Accessible name, e.g. "Esforço da série 1 de Supino". */
  label: string;
  /** Set number and exercise name, for the name of the collapsed button. */
  labelParams: { number: number; name: string };
  name: string;
  selected: SetEffort | undefined;
  onSelect: (effort: SetEffort) => void;
}

const FOCUS_CLASS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";
const OPTION_CLASS =
  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2 text-sm has-[:checked]:border-accent-strong has-[:checked]:font-semibold";
const RADIO_CLASS = `size-5 accent-accent-strong ${FOCUS_CLASS}`;
const CHOSEN_CLASS = `flex min-h-11 items-center self-start px-1 text-sm text-muted underline-offset-4 hover:underline ${FOCUS_CLASS}`;

function EffortOptions({ label, name, selected, onSelect }: Omit<SetEffortChoiceProps, "labelParams">) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {SET_EFFORTS.map((effort) => (
        <label key={effort} className={OPTION_CLASS}>
          <input type="radio" name={name} checked={selected === effort} onChange={() => onSelect(effort)} className={RADIO_CLASS} />
          <span>{translate(`training.effort.${effort}`)}</span>
        </label>
      ))}
    </div>
  );
}

/** Optional "fácil / ok / no limite" of a checked set (step 3B.3); once chosen it collapses into one button (spec 015). */
export function SetEffortChoice({ labelParams, selected, onSelect, ...optionsProps }: SetEffortChoiceProps) {
  const [isChanging, setIsChanging] = useState(false);
  const choose = (effort: SetEffort) => {
    setIsChanging(false);
    onSelect(effort);
  };
  if (selected === undefined || isChanging) return <EffortOptions {...optionsProps} selected={selected} onSelect={choose} />;
  const effort = translate(`training.effort.${selected}`);
  return (
    <button type="button" onClick={() => setIsChanging(true)} aria-label={translate("training.effort.changeLabel", { ...labelParams, effort })} className={CHOSEN_CLASS}>
      {translate("training.effort.chosen", { effort })}
    </button>
  );
}
