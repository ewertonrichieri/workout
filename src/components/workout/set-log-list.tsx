import { translate, type TranslationKey } from "@/lib/i18n/translate";
import { resolveSetDefaults, type SetEntry } from "@/lib/training/set-log-draft";
import { SetLogRow } from "./set-log-row";

interface SetLogListProps {
  exerciseName: string;
  repsTarget: string;
  /** Fixed prescription that fills an empty first set; null for a range (spec 015). */
  fixedReps: number | null;
  sets: readonly SetEntry[];
  onSetChange: (setIndex: number, patch: Partial<SetEntry>) => void;
}

const COLUMN_KEYS: TranslationKey[] = ["training.setColumn", "training.repsColumn", "training.loadColumn", "training.doneColumn"];
const FIRST_SET_NUMBER = 1;

/** Visual column headers (each field already has its own accessible label). */
function SetColumnHeaders() {
  return (
    <div aria-hidden="true" className="grid grid-cols-[3rem_1fr_1fr_2.75rem] gap-2 text-center text-xs text-muted">
      {COLUMN_KEYS.map((key) => <span key={key}>{translate(key)}</span>)}
    </div>
  );
}

export function SetLogList({ exerciseName, repsTarget, fixedReps, sets, onSetChange }: SetLogListProps) {
  return (
    <div className="flex flex-col gap-2">
      <SetColumnHeaders />
      <ol aria-label={translate("training.setsLabel", { name: exerciseName })} className="flex flex-col gap-2">
        {sets.map((entry, index) => (
          <SetLogRow
            key={index}
            setNumber={index + FIRST_SET_NUMBER}
            exerciseName={exerciseName}
            entry={entry}
            defaults={resolveSetDefaults(sets, index, fixedReps)}
            repsTarget={repsTarget}
            onChange={(patch) => onSetChange(index, patch)}
          />
        ))}
      </ol>
    </div>
  );
}
