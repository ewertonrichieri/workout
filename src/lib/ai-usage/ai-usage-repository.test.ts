import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseAiUsageRepository } from "./ai-usage-repository";

const LIMIT = { maxRequests: 3, windowSeconds: 86_400 };

function createRpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("AI usage repository", () => {
  it("counts and registers the request in one database call", async () => {
    const client = createRpcClient({ data: true, error: null });
    await expect(createSupabaseAiUsageRepository(client).registerRequest("plan.generate", LIMIT)).resolves.toBe(true);
    expect(client.rpc).toHaveBeenCalledWith("register_ai_request", { p_operation: "plan.generate", p_max_requests: 3, p_window_seconds: 86_400 });
  });

  it("reports a reached limit", async () => {
    await expect(createSupabaseAiUsageRepository(createRpcClient({ data: false, error: null })).registerRequest("readiness.adjust", LIMIT)).resolves.toBe(false);
  });

  it("fails on errors or unexpected answers", async () => {
    await expect(createSupabaseAiUsageRepository(createRpcClient({ data: null, error: { message: "x" } })).registerRequest("plan.generate", LIMIT)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseAiUsageRepository(createRpcClient({ data: "yes", error: null })).registerRequest("plan.generate", LIMIT)).rejects.toBeInstanceOf(RepositoryError);
  });
});
