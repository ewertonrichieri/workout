import { MAX_EXERCISES_PER_WORKOUT, NEW_EXERCISE_DEFAULT_REPS, NEW_EXERCISE_DEFAULT_SETS } from "@/lib/constants/plan-generation";
import type { Workout } from "./plan-types";
import { editedExerciseSchema, type EditedExercise, type EditedExerciseField } from "./workout-edit-schema";

/** Exercise shown in the editor (catalog slug and display name). */
export interface DraftExerciseInfo {
  slug: string;
  name: string;
}

/** One row of the editor; numbers stay as typed text until validation. */
export interface DraftExercise {
  key: string;
  id: string | null;
  exercise: DraftExerciseInfo;
  category: string;
  sets: string;
  repsMin: string;
  repsMax: string;
  restSeconds: string;
  notes: string;
}

export type DraftTextField = "category" | "sets" | "repsMin" | "repsMax" | "restSeconds" | "notes";

export interface DraftValidation {
  payload: { exercises: EditedExercise[] } | null;
  /** Invalid fields per row key, in form order. */
  errors: Record<string, EditedExerciseField[]>;
  listError: "empty" | "tooMany" | null;
}

const FIELD_ORDER: EditedExerciseField[] = ["exerciseSlug", "category", "sets", "repsMin", "repsMax", "restSeconds", "notes"];

export function createDraft(workout: Workout): DraftExercise[] {
  return workout.exercises.map((item) => ({
    key: item.id,
    id: item.id,
    exercise: { slug: item.exercise.slug, name: item.exercise.name },
    category: item.category ?? "",
    sets: String(item.sets),
    repsMin: String(item.repsMin),
    repsMax: String(item.repsMax),
    restSeconds: item.restSeconds === null ? "" : String(item.restSeconds),
    notes: item.notes ?? "",
  }));
}

export function moveDraftExercise(draft: DraftExercise[], key: string, direction: -1 | 1): DraftExercise[] {
  const from = draft.findIndex((item) => item.key === key);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= draft.length) return draft;
  const next = [...draft];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function removeDraftExercise(draft: DraftExercise[], key: string): DraftExercise[] {
  return draft.filter((item) => item.key !== key);
}

/** Keeps the prescription; the server turns a kept id with another exercise into a new item. */
export function replaceDraftExercise(draft: DraftExercise[], key: string, exercise: DraftExerciseInfo): DraftExercise[] {
  return draft.map((item) => (item.key === key ? { ...item, exercise } : item));
}

/** Undo of a removal: back at its former position (or at the end when the list became shorter). */
export function restoreDraftExercise(draft: DraftExercise[], item: DraftExercise, index: number): DraftExercise[] {
  const position = Math.min(index, draft.length);
  return [...draft.slice(0, position), item, ...draft.slice(position)];
}

export function addDraftExercise(draft: DraftExercise[], exercise: DraftExerciseInfo, key: string): DraftExercise[] {
  const reps = String(NEW_EXERCISE_DEFAULT_REPS);
  return [...draft, { key, id: null, exercise, category: "", sets: String(NEW_EXERCISE_DEFAULT_SETS), repsMin: reps, repsMax: reps, restSeconds: "", notes: "" }];
}

export function updateDraftField(draft: DraftExercise[], key: string, field: DraftTextField, value: string): DraftExercise[] {
  return draft.map((item) => (item.key === key ? { ...item, [field]: value } : item));
}

/** Empty number → NaN (invalid), except rest where empty means "no rest". */
function parseInteger(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

function toRawItem(item: DraftExercise) {
  return {
    id: item.id,
    exerciseSlug: item.exercise.slug,
    category: item.category,
    sets: parseInteger(item.sets),
    repsMin: parseInteger(item.repsMin),
    repsMax: parseInteger(item.repsMax),
    restSeconds: item.restSeconds.trim() === "" ? null : parseInteger(item.restSeconds),
    notes: item.notes,
  };
}

/** Parsed row, or null while some value is invalid (used by the editor summary, spec 015). */
export function parseDraftExercise(item: DraftExercise): EditedExercise | null {
  const parsed = editedExerciseSchema.safeParse(toRawItem(item));
  return parsed.success ? parsed.data : null;
}

function findListError(count: number): DraftValidation["listError"] {
  if (count === 0) return "empty";
  return count > MAX_EXERCISES_PER_WORKOUT ? "tooMany" : null;
}

/** Same schema as the server; the body is built only when every row is valid. */
export function validateDraft(draft: DraftExercise[]): DraftValidation {
  const errors: DraftValidation["errors"] = {};
  const exercises: EditedExercise[] = [];
  for (const item of draft) {
    const parsed = editedExerciseSchema.safeParse(toRawItem(item));
    if (parsed.success) exercises.push(parsed.data);
    else errors[item.key] = FIELD_ORDER.filter((field) => parsed.error.issues.some((issue) => issue.path[0] === field));
  }
  const listError = findListError(draft.length);
  const isValid = listError === null && Object.keys(errors).length === 0;
  return { payload: isValid ? { exercises } : null, errors, listError };
}
