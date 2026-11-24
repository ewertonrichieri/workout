import { describe, expect, it } from "vitest";
import type { CatalogExercise } from "../catalog-exercise";
import type { MediaHosting } from "../media/media-hosting";
import { buildCatalogSeedSql, toSqlLiteral, type CatalogSeedInput } from "./build-catalog-seed-sql";

const hosting: MediaHosting = {
  cdnBaseUrl: "https://cdn.example.test/gh",
  sources: {
    "workout-free-videos": { license: "CC0-1.0", priority: 10, repository: { name: "owner/videos", commit: "abc123" } },
    "free-exercise-db-with-videos": { license: "unverified", priority: 20 },
    "exercise-library": { license: "unverified", priority: 30, repository: { name: "owner/library", commit: "def456" } },
  },
};

const exercise: CatalogExercise = {
  slug: "fake-runner-s-press",
  nameEn: "Fake Runner's Press",
  namePt: null,
  difficulty: "beginner",
  instructionStepsEn: ["Press."],
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: ["dumbbell"],
  sourceRefs: [{ source: "workout-free-videos", externalId: "w1" }],
  media: [{ source: "workout-free-videos", location: "repository_path", mediaType: "video", path: "media/a.mp4" }],
};

function buildInput(overrides: Partial<CatalogSeedInput> = {}): CatalogSeedInput {
  return {
    exercises: [exercise],
    muscles: [{ slug: "chest", namePt: "Peitoral", aliases: [] }, { slug: "triceps", namePt: "Tríceps", aliases: [] }],
    equipment: [{ slug: "dumbbell", namePt: "Halteres", aliases: [] }],
    mediaHosting: hosting,
    ...overrides,
  };
}

describe("toSqlLiteral", () => {
  it("quotes text and escapes single quotes", () => {
    expect(toSqlLiteral("Runner's")).toBe("'Runner''s'");
  });

  it("writes numbers and null as SQL values", () => {
    expect(toSqlLiteral(10)).toBe("10");
    expect(toSqlLiteral(null)).toBe("null");
  });
});

describe("buildCatalogSeedSql", () => {
  const sql = buildCatalogSeedSql(buildInput());

  it("runs everything in one transaction", () => {
    expect(sql.trimStart()).toMatch(/^--[^\n]*\n(?:--[^\n]*\n)*begin;/);
    expect(sql.trimEnd()).toMatch(/commit;$/);
  });

  it("upserts vocabulary and exercises by slug", () => {
    expect(sql).toContain("('chest', 'Peitoral')");
    expect(sql).toContain("on conflict (slug) do update set name_pt = excluded.name_pt;");
    expect(sql).toMatch(/insert into public\.exercises[\s\S]*on conflict \(slug\) do update/);
  });

  it("falls back to the English name while there is no pt-BR name", () => {
    expect(sql).toContain("('fake-runner-s-press', 'Fake Runner''s Press', 'Fake Runner''s Press', 'beginner', null)");
  });

  it("rewrites relation rows resolved by slug", () => {
    expect(sql).toContain("delete from public.exercise_muscles;");
    expect(sql).toContain("('fake-runner-s-press', 'chest', 'primary')");
    expect(sql).toContain("('fake-runner-s-press', 'triceps', 'secondary')");
    expect(sql).toContain("('fake-runner-s-press', 'dumbbell')");
    expect(sql).toContain("('fake-runner-s-press', 'workout-free-videos', 'w1')");
  });

  it("stores resolved media with source, license and priority", () => {
    expect(sql).toContain(
      "('fake-runner-s-press', 'video', 'https://cdn.example.test/gh/owner/videos@abc123/media/a.mp4', null, 'workout-free-videos', 'CC0-1.0', 10)",
    );
  });

  it("skips relation inserts that have no rows", () => {
    const withoutSecondary = buildCatalogSeedSql(buildInput({ exercises: [{ ...exercise, primaryMuscles: [], secondaryMuscles: [] }] }));
    expect(withoutSecondary).not.toContain("insert into public.exercise_muscles");
  });
});
