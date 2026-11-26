import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import { createDraft, parseDraftExercise, removeDraftExercise, restoreDraftExercise, updateDraftField } from "./workout-edit-draft";

const uuid = (digit: number) => `${digit}`.repeat(8) + `-${digit}${digit}${digit}${digit}-4${digit}${digit}${digit}-8${digit}${digit}${digit}-` + `${digit}`.repeat(12);
const WORKOUT = buildWorkout("A", 1, [1, 2, 3].map((position) => buildWorkoutExercise(position, { id: uuid(position) })));

describe("restoreDraftExercise", () => {
  it("puts a removed exercise back at its position", () => {
    const draft = createDraft(WORKOUT);
    const removed = draft[1];
    const restored = restoreDraftExercise(removeDraftExercise(draft, removed.key), removed, 1);
    expect(restored.map((item) => item.key)).toEqual(draft.map((item) => item.key));
  });

  it("appends at the end when the list became shorter", () => {
    const draft = createDraft(WORKOUT);
    const removed = draft[2];
    const shorter = removeDraftExercise(removeDraftExercise(draft, removed.key), draft[0].key);
    expect(restoreDraftExercise(shorter, removed, 2).map((item) => item.key)).toEqual([draft[1].key, removed.key]);
  });
});

describe("parseDraftExercise", () => {
  it("returns the parsed prescription of a valid row", () => {
    expect(parseDraftExercise(createDraft(WORKOUT)[0])).toMatchObject({ sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60 });
  });

  it("returns null while a value is invalid", () => {
    const [first] = updateDraftField(createDraft(WORKOUT), WORKOUT.exercises[0].id, "sets", "abc");
    expect(parseDraftExercise(first)).toBeNull();
  });
});
