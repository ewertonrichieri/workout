"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buildWorkoutHref } from "@/components/workout/workout-labels";
import { MAX_EXERCISES_PER_WORKOUT } from "@/lib/constants/plan-generation";
import { sendJsonRequest } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import {
  addDraftExercise,
  createDraft,
  removeDraftExercise,
  replaceDraftExercise,
  restoreDraftExercise,
  validateDraft,
  type DraftExercise,
  type DraftExerciseInfo,
  type DraftValidation,
} from "@/lib/training/workout-edit-draft";

export type PickerMode = { name: "add" } | { name: "replace"; key: string } | null;
type SaveState = { name: "idle" } | { name: "saving" } | { name: "error"; message: string };
/** Last removed exercise, kept for "Desfazer" (spec 015). */
export type RemovedExercise = { item: DraftExercise; index: number } | null;

const NEW_KEY_PREFIX = "new";

function describeInvalidDraft(validation: DraftValidation): string {
  if (validation.listError === "empty") return translate("planEdit.emptyList");
  if (validation.listError === "tooMany") return translate("planEdit.tooMany", { max: MAX_EXERCISES_PER_WORKOUT });
  return translate("planEdit.fixErrors");
}

/** `onInvalid` receives the keys of the rows with errors, so the editor can open them. */
function useDraftSave(workout: Workout, onInvalid: (keys: string[]) => void) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ name: "idle" });
  const [errors, setErrors] = useState<DraftValidation["errors"]>({});
  const save = async (draft: DraftExercise[]) => {
    const validation = validateDraft(draft);
    setErrors(validation.errors);
    onInvalid(Object.keys(validation.errors));
    if (!validation.payload) return setSaveState({ name: "error", message: describeInvalidDraft(validation) });
    setSaveState({ name: "saving" });
    const url = `/api/workouts/${workout.id}/exercises`;
    const result = await sendJsonRequest(url, "PUT", validation.payload, translate("planEdit.failed"));
    if (result.ok) router.push(buildWorkoutHref(workout.label));
    else setSaveState({ name: "error", message: result.message });
  };
  const reset = () => {
    setErrors({});
    setSaveState({ name: "idle" });
  };
  return { saveState, errors, save, reset };
}

/** Which rows are open; rows start closed (spec 015). */
function useExpandedRows() {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const expand = (keys: readonly string[]) => setExpandedKeys((current) => new Set([...current, ...keys]));
  const toggle = (key: string) =>
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  return { expandedKeys, expand, toggle, collapseAll: () => setExpandedKeys(new Set()) };
}

/** Removal with "Desfazer": the removed row goes back to its position (spec 015). */
function useRemoval(draft: DraftExercise[], setDraft: (update: (current: DraftExercise[]) => DraftExercise[]) => void) {
  const [removed, setRemoved] = useState<RemovedExercise>(null);
  const remove = (key: string) => {
    const index = draft.findIndex((item) => item.key === key);
    if (index >= 0) setRemoved({ item: draft[index], index });
    setDraft((current) => removeDraftExercise(current, key));
  };
  const undoRemove = () => {
    if (removed) setDraft((current) => restoreDraftExercise(current, removed.item, removed.index));
    setRemoved(null);
  };
  return { removed, remove, undoRemove, clearRemoved: () => setRemoved(null) };
}

/** Editor state: nothing is saved until "Salvar alterações"; "Descartar" restores the saved workout. */
export function useWorkoutEditor(workout: Workout) {
  const [draft, setDraft] = useState(() => createDraft(workout));
  const [picker, setPicker] = useState<PickerMode>(null);
  const nextKey = useRef(0);
  const rows = useExpandedRows();
  const removal = useRemoval(draft, setDraft);
  const { saveState, errors, save, reset } = useDraftSave(workout, rows.expand);
  const choose = (exercise: DraftExerciseInfo) => {
    if (picker?.name === "replace") setDraft((current) => replaceDraftExercise(current, picker.key, exercise));
    else {
      const key = `${NEW_KEY_PREFIX}-${(nextKey.current += 1)}`;
      setDraft((current) => addDraftExercise(current, exercise, key));
      rows.expand([key]);
    }
    setPicker(null);
  };
  const discard = () => {
    setDraft(createDraft(workout));
    setPicker(null);
    rows.collapseAll();
    removal.clearRemoved();
    reset();
  };
  return { draft, setDraft, picker, setPicker, choose, discard, errors, saveState, save: () => void save(draft), rows, removal };
}
