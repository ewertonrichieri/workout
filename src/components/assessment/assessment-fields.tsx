export const FOCUS_CLASS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";
export const INPUT_CLASS = `min-h-11 w-full rounded-lg border border-border bg-surface px-3 ${FOCUS_CLASS}`;
const OPTION_CLASS = "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3 has-[:checked]:border-accent-strong";
const CONTROL_CLASS = `size-5 shrink-0 accent-accent-strong ${FOCUS_CLASS}`;

export interface ChoiceOption {
  value: string;
  label: string;
}

interface FieldTextProps {
  id: string;
  hint?: string;
  error?: string;
}

/** Hint and error under a field; ids feed aria-describedby. */
export function FieldText({ id, hint, error }: FieldTextProps) {
  return (
    <>
      {hint && <span id={`${id}-hint`} className="text-sm text-muted">{hint}</span>}
      {error && <span id={`${id}-error`} className="text-sm font-medium text-accent-strong">{error}</span>}
    </>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

interface ChoiceFieldsetProps extends FieldTextProps {
  legend: string;
  name: string;
  type: "radio" | "checkbox";
  options: readonly ChoiceOption[];
  isChecked: (value: string) => boolean;
  /** Makes the group controlled (e.g. equipment replaced by a preset); otherwise isChecked is only the default. */
  onToggle?: (value: string, isChecked: boolean) => void;
}

/** Radio or checkbox group with legend, hint and error, each option a 44px target. */
export function ChoiceFieldset({ id, legend, name, type, options, isChecked, onToggle, hint, error }: ChoiceFieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)}>
      <legend className="mb-1 font-semibold">{legend}</legend>
      <FieldText id={id} hint={hint} error={error} />
      {options.map((option) => (
        <label key={option.value} className={OPTION_CLASS}>
          {onToggle
            ? <input type={type} name={name} value={option.value} checked={isChecked(option.value)} onChange={(event) => onToggle(option.value, event.currentTarget.checked)} className={CONTROL_CLASS} />
            : <input type={type} name={name} value={option.value} defaultChecked={isChecked(option.value)} className={CONTROL_CLASS} />}
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
