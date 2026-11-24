import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseExerciseRepository } from "./exercise-repository";

const FIRST_ID = "6f1c2a52-6d0e-4f1a-9a0a-1b2c3d4e5f60";
const SECOND_ID = "7a2d3b63-7e1f-4a2b-8b1b-2c3d4e5f6a71";

function buildRow(id: string, slug: string): Record<string, unknown> {
  return {
    id, slug, name_pt: slug, name_en: null, difficulty: null, instructions_pt: null,
    exercise_muscles: [], exercise_equipment: [], exercise_media: [],
  };
}

interface FakeResponses {
  rpc?: { data: unknown; error: { message: string } | null };
  rows?: { data: unknown; error: { message: string } | null };
}

/** Minimal stand-in for the Supabase query builder calls used by the repository. */
function createFakeClient({ rpc, rows }: FakeResponses) {
  const rowsResult = rows ?? { data: [], error: null };
  const builder = {
    select: vi.fn(() => builder),
    in: vi.fn(async () => rowsResult),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => rowsResult),
    order: vi.fn(async () => rowsResult),
  };
  const client = { rpc: vi.fn(async () => rpc ?? { data: [], error: null }), from: vi.fn(() => builder) };
  return { client: client as unknown as SupabaseClient, fake: client, builder };
}

const CRITERIA = { query: "supino", page: 2, pageSize: 10 };

describe("supabase exercise repository", () => {
  it("calls the search function with offset and keeps its order", async () => {
    const { client, fake } = createFakeClient({
      rpc: { data: [{ id: SECOND_ID, total_count: 12 }, { id: FIRST_ID, total_count: 12 }], error: null },
      rows: { data: [buildRow(FIRST_ID, "first"), buildRow(SECOND_ID, "second")], error: null },
    });
    const result = await createSupabaseExerciseRepository(client).search(CRITERIA);
    expect(fake.rpc).toHaveBeenCalledWith("search_exercises", {
      search_text: "supino", muscle_slug: null, equipment_slug: null, page_limit: 10, page_offset: 10,
    });
    expect(result.items.map((item) => item.slug)).toEqual(["second", "first"]);
    expect(result.total).toBe(12);
  });

  it("returns an empty page without fetching rows", async () => {
    const { client, fake } = createFakeClient({});
    await expect(createSupabaseExerciseRepository(client).search(CRITERIA)).resolves.toEqual({ items: [], total: 0 });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("turns database errors into a repository error", async () => {
    const { client } = createFakeClient({ rpc: { data: null, error: { message: "boom" } } });
    await expect(createSupabaseExerciseRepository(client).search(CRITERIA)).rejects.toBeInstanceOf(RepositoryError);
  });

  it("returns null for an unknown slug", async () => {
    const { client } = createFakeClient({ rows: { data: null, error: null } });
    await expect(createSupabaseExerciseRepository(client).findBySlug("missing")).resolves.toBeNull();
  });

  it("lists filter terms ordered by name", async () => {
    const { client, builder } = createFakeClient({ rows: { data: [{ slug: "chest", name_pt: "Peitoral" }], error: null } });
    await expect(createSupabaseExerciseRepository(client).listMuscles()).resolves.toEqual([{ slug: "chest", name: "Peitoral" }]);
    expect(builder.order).toHaveBeenCalledWith("name_pt");
  });
});
