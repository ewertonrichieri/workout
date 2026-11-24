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
  replaceDraftExercise,
  validateDraft,
  type DraftExercise,
  type DraftExerciseInfo,
  type DraftValidation,
} from "@/lib/training/workout-edit-draft";

export type PickerMode = { name: "add" } | { name: "replace"; key: string } | null;
type SaveState = { name: "idle" } | { name: "saving" } | { name: "error"; message: string };

const NEW_KEY_PREFIX = "new";

function describeInvalidDraft(validation: DraftValidation): string {
  if (validation.listError === "empty") return translate("planEdit.emptyList");
  if (validation.listError === "tooMany") return translate("planEdit.tooMany", { max: MAX_EXERCISES_PER_WORKOUT });
  return translate("planEdit.fixErrors");
}

function useDraftSave(workout: Workout) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>({ name: "idle" });
  const [errors, setErrors] = useState<DraftValidation["errors"]>({});
  const save = async (draft: DraftExercise[]) => {
    const validation = validateDraft(draft);
    setErrors(validation.errors);
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

/** Editor state: nothing is saved until "Salvar alterações"; "Descartar" restores the saved workout. */
export function useWorkoutEditor(workout: Workout) {
  const [draft, setDraft] = useState(() => createDraft(workout));
  const [picker, setPicker] = useState<PickerMode>(null);
  const nextKey = useRef(0);
  const { saveState, errors, save, reset } = useDraftSave(workout);
  const choose = (exercise: DraftExerciseInfo) => {
    if (picker?.name === "replace") setDraft((current) => replaceDraftExercise(current, picker.key, exercise));
    else setDraft((current) => addDraftExercise(current, exercise, `${NEW_KEY_PREFIX}-${(nextKey.current += 1)}`));
    setPicker(null);
  };
  const discard = () => {
    setDraft(createDraft(workout));
    setPicker(null);
    reset();
  };
  return { draft, setDraft, picker, setPicker, choose, discard, errors, saveState, save: () => void save(draft) };
}
