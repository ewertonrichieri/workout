import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabasePlanRepository } from "./plan-repository";

const USER_ID = "99999999-9999-4999-8999-999999999999";

function createFakeClient(result: { data: unknown; error: { message: string } | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  const client = { from: vi.fn(() => builder) };
  return { client: client as unknown as SupabaseClient, builder };
}

describe("supabase plan repository", () => {
  it("filters the active plan of the given user", async () => {
    const { client, builder } = createFakeClient({ data: null, error: null });
    await expect(createSupabasePlanRepository(client).findActivePlan(USER_ID)).resolves.toBeNull();
    expect(builder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(builder.eq).toHaveBeenCalledWith("status", "active");
  });

  it("turns database errors into a repository error", async () => {
    const { client } = createFakeClient({ data: null, error: { message: "boom" } });
    await expect(createSupabasePlanRepository(client).findActivePlan(USER_ID)).rejects.toBeInstanceOf(RepositoryError);
  });
});
