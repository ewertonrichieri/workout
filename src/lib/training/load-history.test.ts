import { describe, expect, it } from "vitest";
import { buildExerciseProgress } from "./load-history";

const ROWS = [
  { sessionId: "s2", finishedAt: "2026-11-24T02:30:00.000Z", setNumber: 1, repsDone: 8, loadKg: 22.5 },
  { sessionId: "s2", finishedAt: "2026-11-24T02:30:00.000Z", setNumber: 2, repsDone: 6, loadKg: 22.5 },
  { sessionId: "s2", finishedAt: "2026-11-24T02:30:00.000Z", setNumber: 3, repsDone: 10, loadKg: 20 },
  { sessionId: "s1", finishedAt: "2026-11-20T12:00:00.000Z", setNumber: 1, repsDone: 12, loadKg: null },
  { sessionId: "s3", finishedAt: "2026-11-26T12:00:00.000Z", setNumber: 1, repsDone: 10, loadKg: 25 },
];

describe("buildExerciseProgress", () => {
  it("summarizes each session chronologically with the local calendar date", () => {
    expect(buildExerciseProgress(ROWS, "America/Sao_Paulo", 10)).toEqual([
      { sessionId: "s1", date: "2026-11-20", maxLoadKg: null, repsAtMaxLoad: null, setCount: 1 },
      { sessionId: "s2", date: "2026-11-23", maxLoadKg: 22.5, repsAtMaxLoad: 8, setCount: 3 },
      { sessionId: "s3", date: "2026-11-26", maxLoadKg: 25, repsAtMaxLoad: 10, setCount: 1 },
    ]);
  });

  it("keeps only the latest sessions", () => {
    expect(buildExerciseProgress(ROWS, "America/Sao_Paulo", 2).map((entry) => entry.sessionId)).toEqual(["s2", "s3"]);
  });

  it("returns nothing without logs", () => {
    expect(buildExerciseProgress([], "America/Sao_Paulo", 10)).toEqual([]);
  });
});
