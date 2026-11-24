import { z } from "zod";
import { LOAD_DECIMAL_PLACES, MAX_LOAD_KG, MAX_REPS_DONE } from "@/lib/constants/training";
import type { Workout } from "./plan-types";
import type { FinishedSet, FinishWorkoutInput } from "./session-schema";

/** One set as typed by the user (raw text keeps partial input like "12,"). */
export const setEntrySchema = z.object({ repsDone: z.string(), load: z.string(), isDone: z.boolean() });
export type SetEntry = z.infer<typeof setEntrySchema>;

export const workoutDraftSchema = z.object({
  workoutId: z.string(),
  date: z.string(),
  /** ISO instant of the first edit (session start); `null` until the user types something. */
  startedAt: z.string().nullable().default(null),
  /** Keyed by workout exercise id; one entry per prescribed set, in order. */
  entries: z.record(z.string(), z.array(setEntrySchema)),
});
export type WorkoutDraft = z.infer<typeof workoutDraftSchema>;

export type ParsedNumber = { isValid: true; value: number | null } | { isValid: false };

const WHOLE_NUMBER_PATTERN = /^\d+$/;
const LOAD_PATTERN = new RegExp(`^\\d+(?:[.,]\\d{1,${LOAD_DECIMAL_PLACES}})?$`);
const EMPTY_SET: SetEntry = { repsDone: "", load: "", isDone: false };
const INVALID: ParsedNumber = { isValid: false };

function parseWithinLimit(input: string, pattern: RegExp, maximum: number): ParsedNumber {
  const text = input.trim();
  if (text === "") return { isValid: true, value: null };
  if (!pattern.test(text)) return INVALID;
  const value = Number(text.replace(",", "."));
  return value <= maximum ? { isValid: true, value } : INVALID;
}

/** Reps done: empty or whole number from 0 to `MAX_REPS_DONE`. */
export function parseRepsDone(input: string): ParsedNumber {
  return parseWithinLimit(input, WHOLE_NUMBER_PATTERN, MAX_REPS_DONE);
}

/** Load in kg: empty (bodyweight) or decimal with comma/dot, up to 2 places and `MAX_LOAD_KG`. */
export function parseLoadKg(input: string): ParsedNumber {
  return parseWithinLimit(input, LOAD_PATTERN, MAX_LOAD_KG);
}

/** A set can be checked only with reps filled and every field valid. */
export function canCompleteSet(entry: SetEntry): boolean {
  const reps = parseRepsDone(entry.repsDone);
  return reps.isValid && reps.value !== null && parseLoadKg(entry.load).isValid;
}

function emptySets(count: number): SetEntry[] {
  return Array.from({ length: count }, () => ({ ...EMPTY_SET }));
}

export function createEmptyDraft(workout: Workout, date: string): WorkoutDraft {
  const entries = Object.fromEntries(workout.exercises.map((exercise) => [exercise.id, emptySets(exercise.sets)]));
  return { workoutId: workout.id, date, startedAt: null, entries };
}

/** Records the session start on the first edit; later edits keep it. */
export function markStarted(draft: WorkoutDraft, nowIso: string): WorkoutDraft {
  return draft.startedAt === null ? { ...draft, startedAt: nowIso } : draft;
}

/** Parsed numbers of a checked set (a checked set is always valid, see `updateSetEntry`). */
function toFinishedSet(workoutExerciseId: string, entry: SetEntry, index: number): FinishedSet | null {
  const reps = parseRepsDone(entry.repsDone);
  const load = parseLoadKg(entry.load);
  if (!entry.isDone || !reps.isValid || reps.value === null || !load.isValid) return null;
  return { workoutExerciseId, setNumber: index + 1, repsDone: reps.value, loadKg: load.value };
}

/** Body of "Finalizar treino": only checked sets; the server validates it again. */
export function buildFinishPayload(draft: WorkoutDraft, nowIso: string): FinishWorkoutInput {
  const sets = Object.entries(draft.entries).flatMap(([workoutExerciseId, entries]) =>
    entries.map((entry, index) => toFinishedSet(workoutExerciseId, entry, index)).filter((set) => set !== null),
  );
  return { workoutId: draft.workoutId, startedAt: draft.startedAt ?? nowIso, sets };
}

export function hasUncheckedSets(draft: WorkoutDraft): boolean {
  return Object.values(draft.entries).some((entries) => entries.some((entry) => !entry.isDone));
}

/** Immutable update of one set; a set that can no longer be completed is unchecked. */
export function updateSetEntry(draft: WorkoutDraft, workoutExerciseId: string, setIndex: number, patch: Partial<SetEntry>): WorkoutDraft {
  const sets = draft.entries[workoutExerciseId];
  const current = sets?.[setIndex];
  if (!sets || !current) return draft;
  const merged = { ...current, ...patch };
  const updated = { ...merged, isDone: merged.isDone && canCompleteSet(merged) };
  const nextSets = sets.map((entry, index) => (index === setIndex ? updated : entry));
  return { ...draft, entries: { ...draft.entries, [workoutExerciseId]: nextSets } };
}

export function isExerciseCompleted(sets: readonly SetEntry[] | undefined): boolean {
  return sets !== undefined && sets.length > 0 && sets.every((entry) => entry.isDone);
}

export function countCompletedExercises(draft: WorkoutDraft, workout: Workout): number {
  return workout.exercises.filter((exercise) => isExerciseCompleted(draft.entries[exercise.id])).length;
}

function alignSets(stored: readonly SetEntry[] | undefined, prescribedSets: number): SetEntry[] {
  return emptySets(prescribedSets).map((empty, index) => {
    const entry = stored?.[index];
    return entry ? { ...entry, isDone: entry.isDone && canCompleteSet(entry) } : empty;
  });
}

/** Stored draft (untrusted) for this workout and day, aligned with the current prescription; empty otherwise. */
export function restoreDraft(stored: unknown, workout: Workout, date: string): WorkoutDraft {
  const parsed = workoutDraftSchema.safeParse(stored);
  if (!parsed.success || parsed.data.workoutId !== workout.id || parsed.data.date !== date) return createEmptyDraft(workout, date);
  const entries = Object.fromEntries(workout.exercises.map((exercise) => [exercise.id, alignSets(parsed.data.entries[exercise.id], exercise.sets)]));
  return { workoutId: workout.id, date, startedAt: parsed.data.startedAt, entries };
}
