import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseSubstitutionCacheRepository } from "./substitution-cache-repository";

const KEY = "a".repeat(64);

function createClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("substitution cache repository", () => {
  it("reads the saved choices of the key in order", async () => {
    const client = createClient({ data: [{ exercise_slug: "push-up", reason: "Sem aparelho" }], error: null });
    await expect(createSupabaseSubstitutionCacheRepository(client).findChoices(KEY)).resolves.toEqual([{ slug: "push-up", reason: "Sem aparelho" }]);
    expect(client.rpc).toHaveBeenCalledWith("find_substitution_cache", { p_cache_key: KEY });
  });

  it("returns null when nothing is saved for the key", async () => {
    await expect(createSupabaseSubstitutionCacheRepository(createClient({ data: [], error: null })).findChoices(KEY)).resolves.toBeNull();
  });

  it("saves the choices through the database function", async () => {
    const client = createClient({ data: true, error: null });
    await createSupabaseSubstitutionCacheRepository(client).saveChoices(KEY, [{ slug: "push-up", reason: "Sem aparelho" }]);
    expect(client.rpc).toHaveBeenCalledWith("save_substitution_cache", { p_cache_key: KEY, p_choices: [{ exercise_slug: "push-up", reason: "Sem aparelho" }] });
  });

  it("fails on errors or unexpected data", async () => {
    await expect(createSupabaseSubstitutionCacheRepository(createClient({ data: null, error: { message: "x" } })).findChoices(KEY)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseSubstitutionCacheRepository(createClient({ data: [{ slug: 1 }], error: null })).findChoices(KEY)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseSubstitutionCacheRepository(createClient({ data: null, error: { message: "x" } })).saveChoices(KEY, [])).rejects.toBeInstanceOf(RepositoryError);
  });
});
