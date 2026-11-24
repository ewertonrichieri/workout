import { z } from "zod";
import { LOAD_DECIMAL_PLACES, MAX_LOAD_KG, MAX_REPS_DONE, SET_EFFORTS } from "@/lib/constants/training";
import { draftAdjustmentSchema } from "@/lib/readiness/adjustment-schema";
import { checkinResultSchema } from "@/lib/readiness/readiness-schema";
import type { Workout } from "./plan-types";
import type { FinishedSet, FinishWorkoutInput } from "./session-schema";
import type { SuggestedLoads } from "./suggested-loads";

/** One set as typed by the user (raw text keeps partial input like "12,"). */
export const setEntrySchema = z.object({
  repsDone: z.string(),
  load: z.string(),
  isDone: z.boolean(),
  /** "fácil / ok / no limite" (step 3B.3), only for a checked set; an unknown stored value is dropped. */
  effort: z.enum(SET_EFFORTS).optional().catch(undefined),
});
export type SetEntry = z.infer<typeof setEntrySchema>;

/** Check-in of the day (step 3B.1): done (saved on the server) or skipped by the user. */
export const draftReadinessSchema = z.discriminatedUnion("status", [
  checkinResultSchema.extend({ status: z.literal("done"), adjustment: draftAdjustmentSchema.nullable().default(null) }),
  z.object({ status: z.literal("skipped") }),
]);
export type DraftReadiness = z.infer<typeof draftReadinessSchema>;

export const workoutDraftSchema = z.object({
  workoutId: z.string(),
  date: z.string(),
  /** ISO instant of the first edit (session start); `null` until the user types something. */
  startedAt: z.string().nullable().default(null),
  /** Keyed by workout exercise id; one entry per prescribed set, in order. */
  entries: z.record(z.string(), z.array(setEntrySchema)),
  /** `null` until the user answers or skips the check-in; older drafts have none. */
  readiness: draftReadinessSchema.nullable().default(null),
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

const DECIMAL_POINT = ".";
const DECIMAL_COMMA = ",";

function emptySets(count: number, suggestedLoads: readonly number[] = []): SetEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const suggested = suggestedLoads[index];
    return { ...EMPTY_SET, load: suggested === undefined ? "" : formatLoadInput(suggested) };
  });
}

/** Load as typed in pt-BR ("22,5"). */
export function formatLoadInput(loadKg: number): string {
  return String(loadKg).replace(DECIMAL_POINT, DECIMAL_COMMA);
}

/** New draft; tracked exercises get the suggested load of the latest session (step 2.7). */
export function createEmptyDraft(workout: Workout, date: string, suggestedLoads: SuggestedLoads = {}): WorkoutDraft {
  const entries = Object.fromEntries(workout.exercises.map((exercise) => [exercise.id, emptySets(exercise.sets, suggestedLoads[exercise.id])]));
  return { workoutId: workout.id, date, startedAt: null, entries, readiness: null };
}

export function setReadiness(draft: WorkoutDraft, readiness: DraftReadiness): WorkoutDraft {
  return { ...draft, readiness };
}

/** New suggestions replace a draft only while the user has not edited it. */
export function refreshUntouchedDraft(draft: WorkoutDraft, workout: Workout, suggestedLoads: SuggestedLoads): WorkoutDraft {
  if (draft.startedAt !== null) return draft;
  return { ...createEmptyDraft(workout, draft.date, suggestedLoads), readiness: draft.readiness };
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
  return { workoutExerciseId, setNumber: index + 1, repsDone: reps.value, loadKg: load.value, effort: entry.effort ?? null };
}

/** Body of "Finalizar treino": only checked sets; the server validates it again. */
export function buildFinishPayload(draft: WorkoutDraft, nowIso: string): FinishWorkoutInput {
  const sets = Object.entries(draft.entries).flatMap(([workoutExerciseId, entries]) =>
    entries.map((entry, index) => toFinishedSet(workoutExerciseId, entry, index)).filter((set) => set !== null),
  );
  const readinessCheckinId = draft.readiness?.status === "done" ? draft.readiness.checkinId : null;
  return { workoutId: draft.workoutId, startedAt: draft.startedAt ?? nowIso, sets, readinessCheckinId };
}

export function hasUncheckedSets(draft: WorkoutDraft): boolean {
  return Object.values(draft.entries).some((entries) => entries.some((entry) => !entry.isDone));
}

/** The check needs a completable set; the effort only exists on a checked set. */
function keepEffortOnlyWhenDone(entry: SetEntry): SetEntry {
  const isDone = entry.isDone && canCompleteSet(entry);
  if (isDone) return { ...entry, isDone };
  const { repsDone, load } = entry;
  return { repsDone, load, isDone };
}

/** Immutable update of one set; a set that can no longer be completed is unchecked. */
export function updateSetEntry(draft: WorkoutDraft, workoutExerciseId: string, setIndex: number, patch: Partial<SetEntry>): WorkoutDraft {
  const sets = draft.entries[workoutExerciseId];
  const current = sets?.[setIndex];
  if (!sets || !current) return draft;
  const updated = keepEffortOnlyWhenDone({ ...current, ...patch });
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
    return entry ? keepEffortOnlyWhenDone(entry) : empty;
  });
}

/** One entry list per exercise of `workout`, as many sets as prescribed; typed values are kept. */
export function alignDraftToWorkout(draft: WorkoutDraft, workout: Workout): WorkoutDraft {
  const entries = Object.fromEntries(workout.exercises.map((exercise) => [exercise.id, alignSets(draft.entries[exercise.id], exercise.sets)]));
  return { ...draft, entries };
}

/** After today's workout changes (step 3B.2): an untouched draft takes the new suggestions; an edited one keeps its values. */
export function realignDraft(draft: WorkoutDraft, workout: Workout, suggestedLoads: SuggestedLoads): WorkoutDraft {
  return draft.startedAt === null ? refreshUntouchedDraft(draft, workout, suggestedLoads) : alignDraftToWorkout(draft, workout);
}

export function hasCheckedSets(draft: WorkoutDraft): boolean {
  return Object.values(draft.entries).some((entries) => entries.some((entry) => entry.isDone));
}

/** Stored draft (untrusted) for this workout and day, aligned with the current prescription; empty otherwise. */
export function restoreDraft(stored: unknown, workout: Workout, date: string): WorkoutDraft {
  const parsed = workoutDraftSchema.safeParse(stored);
  if (!parsed.success || parsed.data.workoutId !== workout.id || parsed.data.date !== date) return createEmptyDraft(workout, date);
  return alignDraftToWorkout({ ...parsed.data, workoutId: workout.id }, workout);
}
