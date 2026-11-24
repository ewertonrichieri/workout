import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseSubstitutionRepository } from "./substitution-repository";

function createClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

const ROW = { slug: "push-up", primary_muscles: ["chest"], secondary_muscles: ["triceps"], equipment: ["bodyweight"] };

describe("substitution repository", () => {
  it("reads the original and the candidates through the database function", async () => {
    const client = createClient({ data: { original: { ...ROW, slug: "lever-chest-press" }, candidates: [ROW] }, error: null });
    await expect(createSupabaseSubstitutionRepository(client).listCandidates("lever-chest-press", ["machine"])).resolves.toEqual({
      original: { slug: "lever-chest-press", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"], equipment: ["bodyweight"] },
      candidates: [{ slug: "push-up", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"], equipment: ["bodyweight"] }],
    });
    expect(client.rpc).toHaveBeenCalledWith("list_substitution_candidates", { p_original_slug: "lever-chest-press", p_equipment_slugs: ["machine"] });
  });

  it("accepts a missing original and fails on errors or unexpected data", async () => {
    await expect(createSupabaseSubstitutionRepository(createClient({ data: { original: null, candidates: [] }, error: null })).listCandidates("x", [])).resolves.toEqual({ original: null, candidates: [] });
    await expect(createSupabaseSubstitutionRepository(createClient({ data: null, error: { message: "x" } })).listCandidates("x", [])).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseSubstitutionRepository(createClient({ data: [], error: null })).listCandidates("x", [])).rejects.toBeInstanceOf(RepositoryError);
  });
});
