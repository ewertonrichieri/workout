import { describe, expect, it } from "vitest";
import { buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import {
  canCompleteSet,
  countCompletedExercises,
  createEmptyDraft,
  isExerciseCompleted,
  parseLoadKg,
  parseRepsDone,
  restoreDraft,
  updateSetEntry,
} from "./set-log-draft";

const TODAY = "2026-11-24";
const WORKOUT = buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 2 }), buildWorkoutExercise(2, { sets: 1 })]);
const FIRST = "workout-exercise-1";
const SECOND = "workout-exercise-2";

describe("parseRepsDone", () => {
  it("accepts empty and whole numbers from 0 to 999", () => {
    expect(parseRepsDone("")).toEqual({ isValid: true, value: null });
    expect(parseRepsDone(" 12 ")).toEqual({ isValid: true, value: 12 });
    expect(parseRepsDone("0")).toEqual({ isValid: true, value: 0 });
  });

  it("rejects decimals, negatives, text and values above the limit", () => {
    for (const input of ["8,5", "-1", "abc", "1000"]) expect(parseRepsDone(input).isValid).toBe(false);
  });
});

describe("parseLoadKg", () => {
  it("accepts empty, comma or dot decimals with up to 2 places", () => {
    expect(parseLoadKg("")).toEqual({ isValid: true, value: null });
    expect(parseLoadKg("12,5")).toEqual({ isValid: true, value: 12.5 });
    expect(parseLoadKg("20.25")).toEqual({ isValid: true, value: 20.25 });
    expect(parseLoadKg("9999,99")).toEqual({ isValid: true, value: 9999.99 });
  });

  it("rejects more than 2 decimals, negatives, text and values above the column limit", () => {
    for (const input of ["1,234", "-5", "dez", "10000", "1,2,3"]) expect(parseLoadKg(input).isValid).toBe(false);
  });
});

describe("draft rules", () => {
  it("creates one empty entry per prescribed set", () => {
    const draft = createEmptyDraft(WORKOUT, TODAY);
    expect(draft).toMatchObject({ workoutId: "workout-A", date: TODAY });
    expect(draft.entries[FIRST]).toHaveLength(2);
    expect(draft.entries[SECOND]).toEqual([{ repsDone: "", load: "", isDone: false }]);
  });

  it("only completes a set with valid reps (load optional)", () => {
    expect(canCompleteSet({ repsDone: "10", load: "", isDone: false })).toBe(true);
    expect(canCompleteSet({ repsDone: "", load: "10", isDone: false })).toBe(false);
    expect(canCompleteSet({ repsDone: "10", load: "x", isDone: false })).toBe(false);
  });

  it("updates one set immutably and unchecks it when it becomes invalid", () => {
    const draft = createEmptyDraft(WORKOUT, TODAY);
    const checked = updateSetEntry(updateSetEntry(draft, FIRST, 0, { repsDone: "10" }), FIRST, 0, { isDone: true });
    expect(checked.entries[FIRST][0]).toEqual({ repsDone: "10", load: "", isDone: true });
    expect(draft.entries[FIRST][0].repsDone).toBe("");
    expect(updateSetEntry(checked, FIRST, 0, { repsDone: "" }).entries[FIRST][0].isDone).toBe(false);
  });

  it("ignores a check request on a set that cannot be completed", () => {
    const draft = updateSetEntry(createEmptyDraft(WORKOUT, TODAY), FIRST, 0, { isDone: true });
    expect(draft.entries[FIRST][0].isDone).toBe(false);
  });

  it("counts an exercise as completed when every set is checked", () => {
    let draft = createEmptyDraft(WORKOUT, TODAY);
    draft = updateSetEntry(updateSetEntry(draft, SECOND, 0, { repsDone: "8" }), SECOND, 0, { isDone: true });
    expect(isExerciseCompleted(draft.entries[SECOND])).toBe(true);
    expect(isExerciseCompleted(draft.entries[FIRST])).toBe(false);
    expect(countCompletedExercises(draft, WORKOUT)).toBe(1);
  });
});

describe("restoreDraft", () => {
  const stored = updateSetEntry(createEmptyDraft(WORKOUT, TODAY), FIRST, 1, { repsDone: "9", load: "12,5" });

  it("restores a valid draft of the same workout and day", () => {
    expect(restoreDraft(JSON.parse(JSON.stringify(stored)), WORKOUT, TODAY)).toEqual(stored);
  });

  it("discards drafts of another day, another workout or outside the schema", () => {
    const empty = createEmptyDraft(WORKOUT, TODAY);
    expect(restoreDraft({ ...stored, date: "2026-11-23" }, WORKOUT, TODAY)).toEqual(empty);
    expect(restoreDraft({ ...stored, workoutId: "other" }, WORKOUT, TODAY)).toEqual(empty);
    expect(restoreDraft({ entries: "broken" }, WORKOUT, TODAY)).toEqual(empty);
    expect(restoreDraft(null, WORKOUT, TODAY)).toEqual(empty);
  });

  it("aligns stored sets with the current prescription", () => {
    const changed = buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 3 }), buildWorkoutExercise(3, { sets: 1 })]);
    const restored = restoreDraft(stored, changed, TODAY);
    expect(restored.entries[FIRST]).toHaveLength(3);
    expect(restored.entries[FIRST][1]).toEqual({ repsDone: "9", load: "12,5", isDone: false });
    expect(restored.entries[SECOND]).toBeUndefined();
    expect(restored.entries["workout-exercise-3"]).toHaveLength(1);
  });
});

describe("finish payload", () => {
  it("keeps only checked sets with parsed numbers and set numbers", async () => {
    const { buildFinishPayload, markStarted } = await import("./set-log-draft");
    let draft = markStarted(createEmptyDraft(WORKOUT, TODAY), "2026-11-24T10:00:00.000Z");
    draft = updateSetEntry(draft, FIRST, 1, { repsDone: "10", load: "12,5" });
    draft = updateSetEntry(draft, FIRST, 1, { isDone: true });
    draft = updateSetEntry(draft, SECOND, 0, { repsDone: "8" });
    expect(buildFinishPayload(draft, "2026-11-24T12:00:00.000Z")).toEqual({
      workoutId: "workout-A",
      startedAt: "2026-11-24T10:00:00.000Z",
      sets: [{ workoutExerciseId: FIRST, setNumber: 2, repsDone: 10, loadKg: 12.5, effort: null }],
      readinessCheckinId: null,
    });
  });

  it("keeps the first start time", async () => {
    const { markStarted } = await import("./set-log-draft");
    const started = markStarted(createEmptyDraft(WORKOUT, TODAY), "2026-11-24T10:00:00.000Z");
    expect(markStarted(started, "2026-11-24T11:00:00.000Z").startedAt).toBe("2026-11-24T10:00:00.000Z");
  });
});

describe("suggested loads in the draft", () => {
  it("prefills the load of a new draft with comma decimals", async () => {
    const { createEmptyDraft: create } = await import("./set-log-draft");
    const draft = create(WORKOUT, TODAY, { [FIRST]: [20, 22.5] });
    expect(draft.entries[FIRST].map((entry) => entry.load)).toEqual(["20", "22,5"]);
    expect(draft.entries[SECOND][0].load).toBe("");
  });

  it("refreshes suggestions only while the draft was not edited", async () => {
    const { refreshUntouchedDraft, markStarted } = await import("./set-log-draft");
    const untouched = createEmptyDraft(WORKOUT, TODAY);
    expect(refreshUntouchedDraft(untouched, WORKOUT, { [SECOND]: [30] }).entries[SECOND][0].load).toBe("30");
    const edited = markStarted(untouched, "2026-11-24T10:00:00.000Z");
    expect(refreshUntouchedDraft(edited, WORKOUT, { [SECOND]: [30] })).toBe(edited);
  });
});

describe("check-in of the day in the draft (step 3B.1)", () => {
  const CHECKIN = { status: "done" as const, checkinId: "44444444-4444-4444-8444-444444444444", needsAdjustment: true, hasSeverePain: false, adjustment: null };

  it("starts without a check-in and records a done or skipped one", async () => {
    const { setReadiness } = await import("./set-log-draft");
    const empty = createEmptyDraft(WORKOUT, TODAY);
    expect(empty.readiness).toBeNull();
    expect(setReadiness(empty, CHECKIN).readiness).toEqual(CHECKIN);
    expect(setReadiness(empty, { status: "skipped" }).readiness).toEqual({ status: "skipped" });
  });

  it("survives restoring and new suggested loads", async () => {
    const { refreshUntouchedDraft, setReadiness } = await import("./set-log-draft");
    const withCheckin = setReadiness(createEmptyDraft(WORKOUT, TODAY), CHECKIN);
    expect(restoreDraft(JSON.parse(JSON.stringify(withCheckin)), WORKOUT, TODAY).readiness).toEqual(CHECKIN);
    expect(refreshUntouchedDraft(withCheckin, WORKOUT, { [FIRST]: [20] }).readiness).toEqual(CHECKIN);
  });

  it("restores older drafts without a check-in", () => {
    const older: Record<string, unknown> = { ...createEmptyDraft(WORKOUT, TODAY) };
    delete older.readiness;
    expect(restoreDraft(older, WORKOUT, TODAY).readiness).toBeNull();
  });

  it("sends the check-in id when finishing, never a skipped one", async () => {
    const { buildFinishPayload, setReadiness } = await import("./set-log-draft");
    const draft = updateSetEntry(updateSetEntry(createEmptyDraft(WORKOUT, TODAY), SECOND, 0, { repsDone: "8" }), SECOND, 0, { isDone: true });
    expect(buildFinishPayload(setReadiness(draft, CHECKIN), "2026-11-24T12:00:00.000Z").readinessCheckinId).toBe(CHECKIN.checkinId);
    expect(buildFinishPayload(setReadiness(draft, { status: "skipped" }), "2026-11-24T12:00:00.000Z").readinessCheckinId).toBeNull();
  });
});

describe("today's workout changes (step 3B.2)", () => {
  const LIGHTER = buildWorkout("A", 1, [buildWorkoutExercise(1, { sets: 1 })]);

  it("realigns an untouched draft with the new suggestions and keeps the check-in", async () => {
    const { realignDraft, setReadiness } = await import("./set-log-draft");
    const draft = setReadiness(createEmptyDraft(WORKOUT, TODAY, { [FIRST]: [20, 20] }), { status: "skipped" });
    const realigned = realignDraft(draft, LIGHTER, {});
    expect(realigned.entries).toEqual({ [FIRST]: [{ repsDone: "", load: "", isDone: false }] });
    expect(realigned.readiness).toEqual({ status: "skipped" });
  });

  it("keeps typed values of an edited draft and drops exercises out of today's workout", async () => {
    const { markStarted, realignDraft } = await import("./set-log-draft");
    const edited = markStarted(updateSetEntry(createEmptyDraft(WORKOUT, TODAY), FIRST, 0, { repsDone: "9" }), "2026-11-24T10:00:00.000Z");
    const realigned = realignDraft(edited, LIGHTER, {});
    expect(realigned.entries).toEqual({ [FIRST]: [{ repsDone: "9", load: "", isDone: false }] });
    expect(realigned.startedAt).toBe("2026-11-24T10:00:00.000Z");
  });

  it("knows when a set was checked", async () => {
    const { hasCheckedSets } = await import("./set-log-draft");
    const typed = updateSetEntry(createEmptyDraft(WORKOUT, TODAY), SECOND, 0, { repsDone: "8" });
    expect(hasCheckedSets(typed)).toBe(false);
    expect(hasCheckedSets(updateSetEntry(typed, SECOND, 0, { isDone: true }))).toBe(true);
  });

  it("restores an accepted adjustment kept in the draft", () => {
    const proposal = { checkinId: "44444444-4444-4444-8444-444444444444", summary: "Mais leve.", estimatedMinutes: 30, changes: [] };
    const readiness = { status: "done" as const, checkinId: proposal.checkinId, needsAdjustment: true, hasSeverePain: false, adjustment: { status: "accepted" as const, proposal } };
    const stored = { ...createEmptyDraft(WORKOUT, TODAY), readiness };
    expect(restoreDraft(JSON.parse(JSON.stringify(stored)), WORKOUT, TODAY).readiness).toEqual(readiness);
  });
});

describe("perceived effort per set (step 3B.3)", () => {
  it("records the effort of a checked set and sends it when finishing", async () => {
    const { buildFinishPayload } = await import("./set-log-draft");
    let draft = updateSetEntry(createEmptyDraft(WORKOUT, TODAY), SECOND, 0, { repsDone: "8", load: "20" });
    draft = updateSetEntry(draft, SECOND, 0, { isDone: true });
    draft = updateSetEntry(draft, SECOND, 0, { effort: "max" });
    expect(draft.entries[SECOND][0].effort).toBe("max");
    expect(buildFinishPayload(draft, "2026-11-24T12:00:00.000Z").sets).toEqual([{ workoutExerciseId: SECOND, setNumber: 1, repsDone: 8, loadKg: 20, effort: "max" }]);
  });

  it("ignores the effort of an unchecked set and clears it when the check goes away", () => {
    const typed = updateSetEntry(createEmptyDraft(WORKOUT, TODAY), SECOND, 0, { repsDone: "8" });
    expect(updateSetEntry(typed, SECOND, 0, { effort: "easy" }).entries[SECOND][0].effort).toBeUndefined();
    const checked = updateSetEntry(updateSetEntry(typed, SECOND, 0, { isDone: true }), SECOND, 0, { effort: "ok" });
    expect(updateSetEntry(checked, SECOND, 0, { isDone: false }).entries[SECOND][0].effort).toBeUndefined();
    expect(updateSetEntry(checked, SECOND, 0, { repsDone: "" }).entries[SECOND][0].effort).toBeUndefined();
  });

  it("sends null when no effort was marked and restores a stored effort", async () => {
    const { buildFinishPayload } = await import("./set-log-draft");
    const checked = updateSetEntry(updateSetEntry(createEmptyDraft(WORKOUT, TODAY), SECOND, 0, { repsDone: "8" }), SECOND, 0, { isDone: true });
    expect(buildFinishPayload(checked, "2026-11-24T12:00:00.000Z").sets[0]).toMatchObject({ effort: null });
    const withEffort = updateSetEntry(checked, SECOND, 0, { effort: "easy" });
    expect(restoreDraft(JSON.parse(JSON.stringify(withEffort)), WORKOUT, TODAY).entries[SECOND][0].effort).toBe("easy");
    expect(restoreDraft({ ...withEffort, entries: { [SECOND]: [{ repsDone: "8", load: "", isDone: true, effort: "hard" }] } }, WORKOUT, TODAY).entries[SECOND][0].effort).toBeUndefined();
  });
});
