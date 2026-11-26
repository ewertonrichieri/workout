"use client";

import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { moveDraftExercise, updateDraftField, type DraftExercise } from "@/lib/training/workout-edit-draft";
import { EditExerciseCard } from "./edit-exercise-card";
import { ExercisePicker } from "./exercise-picker";
import { EDIT_BUTTON_CLASS, EDIT_PRIMARY_BUTTON_CLASS } from "./plan-edit-styles";
import { useWorkoutEditor, type PickerMode, type RemovedExercise } from "./use-workout-editor";

function pickerTitle(picker: Exclude<PickerMode, null>, draft: readonly DraftExercise[]): string {
  if (picker.name === "add") return translate("planEdit.pickerTitleAdd");
  const name = draft.find((item) => item.key === picker.key)?.exercise.name ?? "";
  return translate("planEdit.pickerTitleReplace", { name });
}

function EditorActions({ editor }: { editor: ReturnType<typeof useWorkoutEditor> }) {
  const isSaving = editor.saveState.name === "saving";
  return (
    <div className="flex flex-col gap-2">
      {editor.saveState.name === "error" && <p role="alert" className="font-medium text-accent-strong">{editor.saveState.message}</p>}
      <button type="button" onClick={editor.save} disabled={isSaving} className={EDIT_PRIMARY_BUTTON_CLASS}>
        {translate(isSaving ? "planEdit.saving" : "planEdit.saveButton")}
      </button>
      <button type="button" onClick={editor.discard} disabled={isSaving} className={EDIT_BUTTON_CLASS}>{translate("planEdit.discardButton")}</button>
    </div>
  );
}

/** "{exercício} removido do treino." with "Desfazer" (spec 015). */
function RemovedNotice({ removed, onUndo }: { removed: Exclude<RemovedExercise, null>; onUndo: () => void }) {
  const name = removed.item.exercise.name;
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3">
      <p className="text-sm">{translate("planEdit.removedNotice", { name })}</p>
      <button type="button" onClick={onUndo} aria-label={translate("planEdit.undoRemoveLabel", { name })} className={EDIT_BUTTON_CLASS}>
        {translate("planEdit.undoRemove")}
      </button>
    </div>
  );
}

function ExerciseList({ editor, label }: { editor: ReturnType<typeof useWorkoutEditor>; label: string }) {
  const { draft, setDraft, errors, setPicker, rows, removal } = editor;
  return (
    <ol aria-label={translate("planEdit.exercisesLabel", { label })} className="flex flex-col gap-3">
      {draft.map((item, index) => (
        <EditExerciseCard
          key={item.key}
          item={item}
          isFirst={index === 0}
          isLast={index === draft.length - 1}
          isExpanded={rows.expandedKeys.has(item.key)}
          onToggle={() => rows.toggle(item.key)}
          errors={errors[item.key] ?? []}
          onChange={(field, value) => setDraft((current) => updateDraftField(current, item.key, field, value))}
          onMove={(direction) => setDraft((current) => moveDraftExercise(current, item.key, direction))}
          onRemove={() => removal.remove(item.key)}
          onReplace={() => setPicker({ name: "replace", key: item.key })}
        />
      ))}
    </ol>
  );
}

/** Manual editing of one workout of the active plan (step 3.4). */
export function WorkoutEditor({ workout }: { workout: Workout }) {
  const editor = useWorkoutEditor(workout);
  const { picker, draft } = editor;
  return (
    <div className="flex flex-col gap-4">
      <ExerciseList editor={editor} label={workout.label} />
      {editor.removal.removed && <RemovedNotice removed={editor.removal.removed} onUndo={editor.removal.undoRemove} />}
      {picker ? (
        <ExercisePicker title={pickerTitle(picker, draft)} excludedSlugs={new Set(draft.map((item) => item.exercise.slug))} onChoose={editor.choose} onCancel={() => editor.setPicker(null)} />
      ) : (
        <button type="button" onClick={() => editor.setPicker({ name: "add" })} className={EDIT_BUTTON_CLASS}>{translate("planEdit.addButton")}</button>
      )}
      <EditorActions editor={editor} />
    </div>
  );
}
