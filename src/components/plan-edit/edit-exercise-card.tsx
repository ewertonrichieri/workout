"use client";

import {
  MAX_CATEGORY_LENGTH,
  MAX_EXERCISE_NOTES_LENGTH,
  MAX_PLAN_REPS,
  MAX_PLAN_REST_SECONDS,
  MAX_PLAN_SETS,
} from "@/lib/constants/plan-generation";
import { describePrescription } from "@/components/workout/workout-labels";
import { translate, type TranslationKey } from "@/lib/i18n/translate";
import { parseDraftExercise, type DraftExercise, type DraftTextField } from "@/lib/training/workout-edit-draft";
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
  { field: "restSeconds", labelKey: "planEdit.restField", isNumber: true, max: MAX_PLAN_REST_SECONDS },
  { field: "repsMin", labelKey: "planEdit.repsMinField", isNumber: true, max: MAX_PLAN_REPS },
  { field: "repsMax", labelKey: "planEdit.repsMaxField", isNumber: true, max: MAX_PLAN_REPS },
];
const TEXT_FIELDS: FieldSpec[] = [
  { field: "category", labelKey: "planEdit.categoryField", isNumber: false, max: MAX_CATEGORY_LENGTH },
  { field: "notes", labelKey: "planEdit.notesField", isNumber: false, max: MAX_EXERCISE_NOTES_LENGTH },
];
const SUMMARY_CLASS =
  "flex min-h-11 cursor-pointer items-center text-sm font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

export interface EditExerciseCardProps {
  item: DraftExercise;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  errors: readonly EditedExerciseField[];
  onToggle: () => void;
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

function CardActions({ item, isFirst, isLast, onMove, onRemove, onReplace }: Pick<EditExerciseCardProps, "item" | "isFirst" | "isLast" | "onMove" | "onRemove" | "onReplace">) {
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

/** "3 séries · 8 a 12 repetições · Descanso: 1 min", or a warning while a value is invalid. */
function describeDraftPrescription(item: DraftExercise): string {
  const parsed = parseDraftExercise(item);
  return parsed ? describePrescription(parsed) : translate("planEdit.summaryInvalid");
}

function CardHeader({ item, isExpanded, onToggle, panelId }: Pick<EditExerciseCardProps, "item" | "isExpanded" | "onToggle"> & { panelId: string }) {
  const name = item.exercise.name;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-muted">{describeDraftPrescription(item)}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        aria-label={translate(isExpanded ? "planEdit.closeLabel" : "planEdit.editLabel", { name })}
        className={EDIT_BUTTON_CLASS}
      >
        {translate(isExpanded ? "planEdit.closeButton" : "planEdit.editButton")}
      </button>
    </div>
  );
}

/** Open row: the main prescription fields, category and notes under "Mais opções", and the row actions. */
function CardPanel(props: EditExerciseCardProps & { panelId: string }) {
  const { item, errors, onChange, panelId } = props;
  const renderField = (spec: FieldSpec) => <DraftField key={spec.field} spec={spec} item={item} hasError={errors.includes(spec.field)} onChange={onChange} />;
  const hasTextError = TEXT_FIELDS.some((spec) => errors.includes(spec.field));
  return (
    <div id={panelId} className="flex flex-col gap-3">
      {errors.includes("exerciseSlug") && <p className="text-sm font-medium text-accent-strong">{translate("planEdit.fieldErrors.exerciseSlug")}</p>}
      <div className="grid grid-cols-2 gap-3">{NUMBER_FIELDS.map(renderField)}</div>
      <details open={hasTextError || undefined}>
        <summary className={SUMMARY_CLASS}>{translate("planEdit.moreOptions")}</summary>
        <div className="flex flex-col gap-3 pt-2">{TEXT_FIELDS.map(renderField)}</div>
      </details>
      <CardActions {...props} />
    </div>
  );
}

/** One exercise of the editor: closed it shows only the summary; "Editar" opens the fields (spec 015). */
export function EditExerciseCard(props: EditExerciseCardProps) {
  const panelId = `${props.item.key}-panel`;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <CardHeader item={props.item} isExpanded={props.isExpanded} onToggle={props.onToggle} panelId={panelId} />
      {props.isExpanded && <CardPanel {...props} panelId={panelId} />}
    </li>
  );
}
