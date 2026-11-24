"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { buildDraftStorageKey, readStoredDraft, removeStoredDraft, writeStoredDraft } from "@/lib/training/draft-storage";
import type { Workout } from "@/lib/training/plan-types";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import { createEmptyDraft, markStarted, restoreDraft, updateSetEntry, type SetEntry, type WorkoutDraft } from "@/lib/training/set-log-draft";

export type SetChangeHandler = (workoutExerciseId: string, setIndex: number, patch: Partial<SetEntry>) => void;

const DATE_PENDING = "";

/** Draft of the sets typed for a workout, kept on the device until "Finalizar treino" (step 2.6). */
interface WorkoutDraftState {
  draft: WorkoutDraft;
  changeSet: SetChangeHandler;
  /** After "Finalizar treino": removes the stored draft and starts a new empty one. */
  clearDraft: () => void;
}

function today(): string {
  return toDateInTimeZone(new Date(), APP_TIME_ZONE);
}

export function useWorkoutDraft(workout: Workout): WorkoutDraftState {
  const [draft, setDraft] = useState(() => createEmptyDraft(workout, DATE_PENDING));
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    const date = today();
    const key = buildDraftStorageKey(workout.id, date);
    // Device storage only exists after hydration, so the draft is restored here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(restoreDraft(readStoredDraft(key), workout, date));
    setStorageKey(key);
  }, [workout]);

  useEffect(() => {
    if (storageKey) writeStoredDraft(storageKey, draft);
  }, [draft, storageKey]);

  const changeSet = useCallback<SetChangeHandler>((workoutExerciseId, setIndex, patch) => {
    setDraft((current) => markStarted(updateSetEntry(current, workoutExerciseId, setIndex, patch), new Date().toISOString()));
  }, []);

  const clearDraft = useCallback(() => {
    if (storageKey) removeStoredDraft(storageKey);
    setDraft(createEmptyDraft(workout, today()));
  }, [storageKey, workout]);

  return { draft, changeSet, clearDraft };
}
