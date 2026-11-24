"use client";

import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { moveDraftExercise, removeDraftExercise, updateDraftField, type DraftExercise } from "@/lib/training/workout-edit-draft";
import { EditExerciseCard } from "./edit-exercise-card";
import { ExercisePicker } from "./exercise-picker";
import { EDIT_BUTTON_CLASS, EDIT_PRIMARY_BUTTON_CLASS } from "./plan-edit-styles";
import { useWorkoutEditor, type PickerMode } from "./use-workout-editor";

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

function ExerciseList({ editor, label }: { editor: ReturnType<typeof useWorkoutEditor>; label: string }) {
  const { draft, setDraft, errors, setPicker } = editor;
  return (
    <ol aria-label={translate("planEdit.exercisesLabel", { label })} className="flex flex-col gap-3">
      {draft.map((item, index) => (
        <EditExerciseCard
          key={item.key}
          item={item}
          isFirst={index === 0}
          isLast={index === draft.length - 1}
          errors={errors[item.key] ?? []}
          onChange={(field, value) => setDraft((current) => updateDraftField(current, item.key, field, value))}
          onMove={(direction) => setDraft((current) => moveDraftExercise(current, item.key, direction))}
          onRemove={() => setDraft((current) => removeDraftExercise(current, item.key))}
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
      {picker ? (
        <ExercisePicker title={pickerTitle(picker, draft)} excludedSlugs={new Set(draft.map((item) => item.exercise.slug))} onChoose={editor.choose} onCancel={() => editor.setPicker(null)} />
      ) : (
        <button type="button" onClick={() => editor.setPicker({ name: "add" })} className={EDIT_BUTTON_CLASS}>{translate("planEdit.addButton")}</button>
      )}
      <EditorActions editor={editor} />
    </div>
  );
}
