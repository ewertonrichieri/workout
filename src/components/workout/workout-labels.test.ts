import { describe, expect, it } from "vitest";
import {
  buildWorkoutHref,
  describePrescription,
  describeRest,
  describeSetsAndReps,
  describeValidity,
  describeValidityProgress,
  formatCalendarDate,
} from "./workout-labels";

const VALIDITY = { totalDays: 42, elapsedDays: 21, remainingDays: 21, progress: 0.5, isExpired: false };

describe("workout labels", () => {
  it("formats calendar dates as DD/MM/AAAA", () => {
    expect(formatCalendarDate("2026-12-13")).toBe("13/12/2026");
  });

  it("describes sets and reps, single value or range", () => {
    expect(describeSetsAndReps({ sets: 3, repsMin: 10, repsMax: 10 })).toBe("3 séries · 10 repetições");
    expect(describeSetsAndReps({ sets: 4, repsMin: 8, repsMax: 12 })).toBe("4 séries · 8 a 12 repetições");
    expect(describeSetsAndReps({ sets: 1, repsMin: 1, repsMax: 1 })).toBe("1 série · 1 repetição");
  });

  it("describes rest in seconds and minutes", () => {
    expect(describeRest(45)).toBe("Descanso: 45 s");
    expect(describeRest(60)).toBe("Descanso: 1 min");
    expect(describeRest(90)).toBe("Descanso: 1 min 30 s");
    expect(describeRest(null)).toBeNull();
  });

  it("describes the validity: remaining days, last day and expired", () => {
    expect(describeValidity(VALIDITY, "2026-12-13")).toBe("Válido até 13/12/2026 · 21 dias restantes");
    expect(describeValidity({ ...VALIDITY, remainingDays: 1 }, "2026-12-13")).toBe("Válido até 13/12/2026 · 1 dia restante");
    expect(describeValidity({ ...VALIDITY, remainingDays: 0 }, "2026-12-13")).toBe("Válido até 13/12/2026 · último dia");
    expect(describeValidity({ ...VALIDITY, remainingDays: 0, isExpired: true }, "2026-12-13")).toBe("Plano vencido em 13/12/2026");
  });

  it("describes the elapsed share as a rounded percentage", () => {
    expect(describeValidityProgress(1 / 3)).toEqual({ percent: 33, text: "33% do período decorrido" });
  });

  it("builds the workout tab link", () => {
    expect(buildWorkoutHref("B")).toBe("/workout?workout=B");
    expect(buildWorkoutHref("Full body")).toBe("/workout?workout=Full+body");
  });
});

describe("describePrescription", () => {
  it("joins sets, reps and rest in one line", () => {
    expect(describePrescription({ sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60 })).toBe("3 séries · 8 a 12 repetições · Descanso: 1 min");
  });

  it("leaves the rest out when it is not prescribed", () => {
    expect(describePrescription({ sets: 1, repsMin: 10, repsMax: 10, restSeconds: null })).toBe("1 série · 10 repetições");
  });
});
