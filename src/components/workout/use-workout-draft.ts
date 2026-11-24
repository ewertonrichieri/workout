"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/constants/training";
import { adjustWorkoutForDay, omitPrescriptions } from "@/lib/readiness/adjusted-workout";
import { buildDraftStorageKey, readStoredDraft, removeStoredDraft, writeStoredDraft } from "@/lib/training/draft-storage";
import type { Workout } from "@/lib/training/plan-types";
import { toDateInTimeZone } from "@/lib/training/plan-validity";
import {
  createEmptyDraft,
  markStarted,
  realignDraft,
  refreshUntouchedDraft,
  restoreDraft,
  setReadiness,
  updateSetEntry,
  type DraftReadiness,
  type SetEntry,
  type WorkoutDraft,
} from "@/lib/training/set-log-draft";
import type { SuggestedLoads } from "@/lib/training/suggested-loads";

export type SetChangeHandler = (workoutExerciseId: string, setIndex: number, patch: Partial<SetEntry>) => void;

const DATE_PENDING = "";

/** Draft of the sets typed for a workout, kept on the device until "Finalizar treino" (step 2.6). */
interface WorkoutDraftState {
  draft: WorkoutDraft;
  /** Today's workout: the plan with the accepted daily adjustment, if any (step 3B.2). */
  workout: Workout;
  /** Suggestions that still apply today (none for removed or replaced prescriptions). */
  suggestedLoads: SuggestedLoads;
  changedIds: ReadonlySet<string>;
  changeSet: SetChangeHandler;
  /** Check-in and daily adjustment (steps 3B.1, 3B.2); they do not count as the session start. */
  changeReadiness: (readiness: DraftReadiness) => void;
  /** After "Finalizar treino": removes the stored draft and starts a new empty one. */
  clearDraft: () => void;
}

function today(): string {
  return toDateInTimeZone(new Date(), APP_TIME_ZONE);
}

function prepareDay(planned: Workout, plannedSuggestions: SuggestedLoads, readiness: DraftReadiness | null) {
  const day = adjustWorkoutForDay(planned, readiness);
  return { ...day, suggestedLoads: omitPrescriptions(plannedSuggestions, day.changedIds) };
}

/** Stored draft of today, aligned with today's workout (the adjustment it holds decides which one). */
function loadTodayDraft(planned: Workout, plannedSuggestions: SuggestedLoads): { key: string; draft: WorkoutDraft } {
  const date = today();
  const key = buildDraftStorageKey(planned.id, date);
  const stored = readStoredDraft(key);
  const day = prepareDay(planned, plannedSuggestions, restoreDraft(stored, planned, date).readiness);
  return { key, draft: refreshUntouchedDraft(restoreDraft(stored, day.workout, date), day.workout, day.suggestedLoads) };
}

/** Restores today's draft after hydration (device storage only exists then) and saves every change. */
function useStoredDraft(planned: Workout, plannedSuggestions: SuggestedLoads) {
  const [draft, setDraft] = useState(() => createEmptyDraft(planned, DATE_PENDING, plannedSuggestions));
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    const restored = loadTodayDraft(planned, plannedSuggestions);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(restored.draft);
    setStorageKey(restored.key);
  }, [planned, plannedSuggestions]);

  useEffect(() => {
    if (storageKey) writeStoredDraft(storageKey, draft);
  }, [draft, storageKey]);

  return { draft, setDraft, storageKey };
}

/** `suggestedLoads` fill a draft only while it was not edited (step 2.7). */
export function useWorkoutDraft(planned: Workout, plannedSuggestions: SuggestedLoads): WorkoutDraftState {
  const { draft, setDraft, storageKey } = useStoredDraft(planned, plannedSuggestions);
  const day = useMemo(() => prepareDay(planned, plannedSuggestions, draft.readiness), [planned, plannedSuggestions, draft.readiness]);

  const changeSet = useCallback<SetChangeHandler>((workoutExerciseId, setIndex, patch) => {
    setDraft((current) => markStarted(updateSetEntry(current, workoutExerciseId, setIndex, patch), new Date().toISOString()));
  }, [setDraft]);

  const changeReadiness = useCallback((readiness: DraftReadiness) => {
    const next = prepareDay(planned, plannedSuggestions, readiness);
    setDraft((current) => realignDraft(setReadiness(current, readiness), next.workout, next.suggestedLoads));
  }, [planned, plannedSuggestions, setDraft]);

  const clearDraft = useCallback(() => {
    if (storageKey) removeStoredDraft(storageKey);
    setDraft(createEmptyDraft(planned, today(), plannedSuggestions));
  }, [storageKey, planned, plannedSuggestions, setDraft]);

  return { draft, workout: day.workout, suggestedLoads: day.suggestedLoads, changedIds: day.changedIds, changeSet, changeReadiness, clearDraft };
}
