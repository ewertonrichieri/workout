import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import {
  addDraftExercise,
  createDraft,
  moveDraftExercise,
  removeDraftExercise,
  replaceDraftExercise,
  updateDraftField,
  validateDraft,
} from "./workout-edit-draft";

const ID_1 = "11111111-1111-4111-8111-111111111111";
const ID_2 = "22222222-2222-4222-8222-222222222222";
const WORKOUT = buildWorkout("A", 1, [
  buildWorkoutExercise(1, { id: ID_1, category: "Principal", restSeconds: null, notes: "Devagar" }),
  buildWorkoutExercise(2, { id: ID_2 }),
]);
const NEW_EXERCISE = { slug: "goblet-squat", name: "Agachamento goblet" };

describe("workout edit draft", () => {
  it("starts from the saved workout with text fields", () => {
    expect(createDraft(WORKOUT)[0]).toEqual({
      key: ID_1,
      id: ID_1,
      exercise: { slug: "fake-exercise-1", name: "Exercício falso 1" },
      category: "Principal",
      sets: "3",
      repsMin: "8",
      repsMax: "12",
      restSeconds: "",
      notes: "Devagar",
    });
  });

  it("moves, removes, replaces and adds exercises without touching the others", () => {
    const draft = createDraft(WORKOUT);
    expect(moveDraftExercise(draft, ID_2, -1).map((item) => item.key)).toEqual([ID_2, ID_1]);
    expect(moveDraftExercise(draft, ID_1, -1)).toBe(draft);
    expect(removeDraftExercise(draft, ID_1).map((item) => item.key)).toEqual([ID_2]);
    const replaced = replaceDraftExercise(draft, ID_1, NEW_EXERCISE);
    expect(replaced[0]).toMatchObject({ id: ID_1, exercise: NEW_EXERCISE, sets: "3", notes: "Devagar" });
    const added = addDraftExercise(draft, NEW_EXERCISE, "new-1");
    expect(added[2]).toEqual({ key: "new-1", id: null, exercise: NEW_EXERCISE, category: "", sets: "3", repsMin: "10", repsMax: "10", restSeconds: "", notes: "" });
    expect(updateDraftField(draft, ID_2, "sets", "5")[1].sets).toBe("5");
  });

  it("builds the request body when every field is valid", () => {
    const result = validateDraft(createDraft(WORKOUT));
    expect(result.errors).toEqual({});
    expect(result.listError).toBeNull();
    expect(result.payload?.exercises[0]).toEqual({
      id: ID_1,
      exerciseSlug: "fake-exercise-1",
      category: "Principal",
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: null,
      notes: "Devagar",
    });
  });

  it("marks invalid fields per exercise", () => {
    let draft = updateDraftField(createDraft(WORKOUT), ID_1, "sets", "");
    draft = updateDraftField(draft, ID_2, "repsMin", "15");
    const result = validateDraft(draft);
    expect(result.payload).toBeNull();
    expect(result.errors).toEqual({ [ID_1]: ["sets"], [ID_2]: ["repsMax"] });
  });

  it("needs at least one exercise", () => {
    expect(validateDraft([]).listError).toBe("empty");
  });
});
