import { describe, expect, it, vi } from "vitest";
import { createPlanService } from "./plan-service";
import type { PlanRepository } from "./plan-repository";
import type { ActivePlan } from "./plan-types";

const PLAN: ActivePlan = { id: "p1", goal: "strength", origin: "manual", startsOn: "2026-11-01", validUntil: "2026-12-13", workouts: [] };

function createFakeRepository(plan: ActivePlan | null): PlanRepository {
  return { findActivePlan: vi.fn(async () => plan) };
}

describe("plan service", () => {
  it("returns the active plan with its validity for today", async () => {
    const repository = createFakeRepository(PLAN);
    const overview = await createPlanService(repository, () => "2026-11-22").getActivePlanOverview("user-1");
    expect(repository.findActivePlan).toHaveBeenCalledWith("user-1");
    expect(overview).toEqual({ plan: PLAN, validity: { totalDays: 42, elapsedDays: 21, remainingDays: 21, progress: 0.5, isExpired: false } });
  });

  it("returns null when the user has no active plan", async () => {
    await expect(createPlanService(createFakeRepository(null), () => "2026-11-22").getActivePlanOverview("user-1")).resolves.toBeNull();
  });
});
