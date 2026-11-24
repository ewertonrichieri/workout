import { useId } from "react";
import { FOCUS_CLASS } from "@/components/assessment/assessment-fields";

export interface ReadinessOption<Value extends string | number> {
  value: Value;
  label: string;
}

interface ReadinessOptionGroupProps<Value extends string | number> {
  legend: string;
  name: string;
  options: readonly ReadinessOption<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
}

const OPTION_CLASS =
  "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 has-[:checked]:border-accent-strong has-[:checked]:font-semibold";

/** Controlled radio group laid out as tappable chips (each option a 44px target). */
export function ReadinessOptionGroup<Value extends string | number>({ legend, name, options, selected, onSelect }: ReadinessOptionGroupProps<Value>) {
  const legendId = useId();
  return (
    <div role="radiogroup" aria-labelledby={legendId} className="flex flex-col gap-2">
      <span id={legendId} className="font-semibold">{legend}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={OPTION_CLASS}>
            <input
              type="radio"
              name={name}
              checked={option.value === selected}
              onChange={() => onSelect(option.value)}
              className={`size-5 accent-accent-strong ${FOCUS_CLASS}`}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
