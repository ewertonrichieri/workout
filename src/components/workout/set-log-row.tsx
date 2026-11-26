"use client";

import { useId, useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { SetEffortChoice } from "./set-effort-choice";
import { canCompleteSet, fillWithDefaults, parseLoadKg, parseRepsDone, type ParsedNumber, type SetDefaults, type SetEntry } from "@/lib/training/set-log-draft";

interface SetLogRowProps {
  setNumber: number;
  exerciseName: string;
  entry: SetEntry;
  /** Values an empty field takes when the set is checked, shown as placeholders (spec 015). */
  defaults: SetDefaults;
  repsTarget: string;
  onChange: (patch: Partial<SetEntry>) => void;
}

interface NumberFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  inputMode: "numeric" | "decimal";
  errorMessage: string;
  parse: (input: string) => ParsedNumber;
  onChange: (value: string) => void;
}

const FIELD_CLASS =
  "min-h-11 w-full min-w-0 rounded-lg border bg-background px-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** Text input with numeric keyboard; the error shows after leaving the field (partial input like "12," is fine while typing). */
function NumberField({ label, value, placeholder, inputMode, errorMessage, parse, onChange }: NumberFieldProps) {
  const errorId = useId();
  const [hasLeft, setHasLeft] = useState(false);
  const showError = hasLeft && !parse(value).isValid;
  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        inputMode={inputMode}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setHasLeft(true)}
        className={`${FIELD_CLASS} ${showError ? "border-accent-strong" : "border-border"}`}
      />
      {showError && <p id={errorId} className="text-xs text-accent-strong">{errorMessage}</p>}
    </div>
  );
}

type CompleteSetCheckProps = Pick<SetLogRowProps, "entry" | "defaults" | "onChange"> & { label: string };

/** Checking fills the empty fields with the defaults, so a set like the previous one takes one tap. */
function CompleteSetCheck({ label, entry, defaults, onChange }: CompleteSetCheckProps) {
  const hintId = useId();
  const completed = fillWithDefaults(entry, defaults);
  const isAllowed = entry.isDone || canCompleteSet(completed);
  const toggle = (isChecked: boolean) => onChange(isChecked ? { repsDone: completed.repsDone, load: completed.load, isDone: true } : { isDone: false });
  return (
    <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center has-disabled:cursor-not-allowed">
      <input
        type="checkbox"
        aria-label={label}
        checked={entry.isDone}
        disabled={!isAllowed}
        aria-describedby={isAllowed ? undefined : hintId}
        onChange={(event) => toggle(event.target.checked)}
        className="size-6 accent-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
      />
      {!isAllowed && <span id={hintId} className="sr-only">{translate("training.completeSetHint")}</span>}
    </label>
  );
}

/** One set: reps done, load (kg), done check and, once checked, the optional effort (step 3B.3). */
export function SetLogRow({ setNumber, exerciseName, entry, defaults, repsTarget, onChange }: SetLogRowProps) {
  const labelParams = { number: setNumber, name: exerciseName };
  const effortName = useId();
  return (
    <li className="grid grid-cols-[3rem_1fr_1fr_2.75rem] items-start gap-2">
      <span className="flex min-h-11 items-center justify-center font-semibold">{setNumber}</span>
      <NumberField label={translate("training.repsDoneLabel", labelParams)} value={entry.repsDone} placeholder={defaults.repsDone || repsTarget} inputMode="numeric" errorMessage={translate("training.invalidReps")} parse={parseRepsDone} onChange={(repsDone) => onChange({ repsDone })} />
      <NumberField label={translate("training.loadLabel", labelParams)} value={entry.load} placeholder={defaults.load || undefined} inputMode="decimal" errorMessage={translate("training.invalidLoad")} parse={parseLoadKg} onChange={(load) => onChange({ load })} />
      <CompleteSetCheck label={translate("training.completeSetLabel", labelParams)} entry={entry} defaults={defaults} onChange={onChange} />
      {entry.isDone && (
        <div className="col-span-4">
          <SetEffortChoice label={translate("training.effort.label", labelParams)} labelParams={labelParams} name={effortName} selected={entry.effort} onSelect={(effort) => onChange({ effort })} />
        </div>
      )}
    </li>
  );
}
