import { SET_EFFORTS, type SetEffort } from "@/lib/constants/training";
import { translate } from "@/lib/i18n/translate";

interface SetEffortChoiceProps {
  /** Accessible name, e.g. "Esforço da série 1 de Supino". */
  label: string;
  name: string;
  selected: SetEffort | undefined;
  onSelect: (effort: SetEffort) => void;
}

const OPTION_CLASS =
  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2 text-sm has-[:checked]:border-accent-strong has-[:checked]:font-semibold";
const RADIO_CLASS = "size-5 accent-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** Optional "fácil / ok / no limite" of a checked set (step 3B.3); each option is a 44px target. */
export function SetEffortChoice({ label, name, selected, onSelect }: SetEffortChoiceProps) {
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
