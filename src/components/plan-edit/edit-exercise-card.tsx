"use client";

import {
  MAX_CATEGORY_LENGTH,
  MAX_EXERCISE_NOTES_LENGTH,
  MAX_PLAN_REPS,
  MAX_PLAN_REST_SECONDS,
  MAX_PLAN_SETS,
} from "@/lib/constants/plan-generation";
import { translate, type TranslationKey } from "@/lib/i18n/translate";
import type { DraftExercise, DraftTextField } from "@/lib/training/workout-edit-draft";
import type { EditedExerciseField } from "@/lib/training/workout-edit-schema";
import { EDIT_BUTTON_CLASS, EDIT_INPUT_CLASS } from "./plan-edit-styles";

interface FieldSpec {
  field: DraftTextField;
  labelKey: TranslationKey;
  isNumber: boolean;
  max: number;
}

const NUMBER_FIELDS: FieldSpec[] = [
  { field: "sets", labelKey: "planEdit.setsField", isNumber: true, max: MAX_PLAN_SETS },
  { field: "repsMin", labelKey: "planEdit.repsMinField", isNumber: true, max: MAX_PLAN_REPS },
  { field: "repsMax", labelKey: "planEdit.repsMaxField", isNumber: true, max: MAX_PLAN_REPS },
  { field: "restSeconds", labelKey: "planEdit.restField", isNumber: true, max: MAX_PLAN_REST_SECONDS },
];
const TEXT_FIELDS: FieldSpec[] = [
  { field: "category", labelKey: "planEdit.categoryField", isNumber: false, max: MAX_CATEGORY_LENGTH },
  { field: "notes", labelKey: "planEdit.notesField", isNumber: false, max: MAX_EXERCISE_NOTES_LENGTH },
];

export interface EditExerciseCardProps {
  item: DraftExercise;
  isFirst: boolean;
  isLast: boolean;
  errors: readonly EditedExerciseField[];
  onChange: (field: DraftTextField, value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onReplace: () => void;
}

function DraftField({ spec, item, hasError, onChange }: { spec: FieldSpec; item: DraftExercise; hasError: boolean; onChange: EditExerciseCardProps["onChange"] }) {
  const id = `${item.key}-${spec.field}`;
  const label = translate(spec.labelKey);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">{label}</label>
      <input
        id={id}
        type={spec.isNumber ? "number" : "text"}
        inputMode={spec.isNumber ? "numeric" : undefined}
        maxLength={spec.isNumber ? undefined : spec.max}
        value={item[spec.field]}
        onChange={(event) => onChange(spec.field, event.target.value)}
        aria-label={translate("planEdit.fieldLabel", { field: label, name: item.exercise.name })}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={EDIT_INPUT_CLASS}
      />
      {hasError && <span id={`${id}-error`} className="text-sm font-medium text-accent-strong">{translate(`planEdit.fieldErrors.${spec.field}`, { max: spec.max })}</span>}
    </div>
  );
}

function CardActions({ item, isFirst, isLast, onMove, onRemove, onReplace }: Omit<EditExerciseCardProps, "errors" | "onChange">) {
  const name = item.exercise.name;
  const action = (labelKey: TranslationKey, textKey: TranslationKey, onClick: () => void, disabled = false) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={translate(labelKey, { name })} className={EDIT_BUTTON_CLASS}>
      {translate(textKey)}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {action("planEdit.moveUp", "planEdit.moveUpText", () => onMove(-1), isFirst)}
      {action("planEdit.moveDown", "planEdit.moveDownText", () => onMove(1), isLast)}
      {action("planEdit.replace", "planEdit.replaceText", onReplace)}
      {action("planEdit.remove", "planEdit.removeText", onRemove)}
    </div>
  );
}

/** One editable exercise: prescription fields with per-field errors and row actions. */
export function EditExerciseCard(props: EditExerciseCardProps) {
  const { item, errors, onChange } = props;
  const renderField = (spec: FieldSpec) => <DraftField key={spec.field} spec={spec} item={item} hasError={errors.includes(spec.field)} onChange={onChange} />;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h3 className="font-semibold">{item.exercise.name}</h3>
      {errors.includes("exerciseSlug") && <p className="text-sm font-medium text-accent-strong">{translate("planEdit.fieldErrors.exerciseSlug")}</p>}
      <div className="grid grid-cols-2 gap-3">{NUMBER_FIELDS.map(renderField)}</div>
      {TEXT_FIELDS.map(renderField)}
      <CardActions {...props} />
    </li>
  );
}
