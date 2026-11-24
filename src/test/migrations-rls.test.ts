import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIRECTORY = join(process.cwd(), "supabase", "migrations");

const CATALOG_TABLES = [
  "muscles",
  "equipment",
  "exercises",
  "exercise_muscles",
  "exercise_equipment",
  "exercise_media",
  "exercise_source_refs",
];

const USER_TABLES = [
  "profiles",
  "assessments",
  "assessment_equipment",
  "plans",
  "workouts",
  "workout_exercises",
  "workout_sessions",
  "set_logs",
];

function readAllMigrations(): string {
  return readdirSync(MIGRATIONS_DIRECTORY)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readFileSync(join(MIGRATIONS_DIRECTORY, fileName), "utf8"))
    .join("\n")
    .toLowerCase();
}

function findCreatedTables(sql: string): string[] {
  return [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/g)].map((match) => match[1]);
}

function findPolicies(sql: string, table: string): string[] {
  const pattern = new RegExp(`create policy [^;]*? on public\\.${table}\\b[^;]*;`, "g");
  return sql.match(pattern) ?? [];
}

describe("database migrations", () => {
  const sql = readAllMigrations();
  const createdTables = findCreatedTables(sql);

  it("creates every MVP table", () => {
    expect(createdTables.sort()).toEqual([...CATALOG_TABLES, ...USER_TABLES].sort());
  });

  it.each([...CATALOG_TABLES, ...USER_TABLES])("enables RLS on %s", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
  });

  it.each(CATALOG_TABLES)("lets authenticated users only read %s", (table) => {
    const policies = findPolicies(sql, table);
    expect(policies).toHaveLength(1);
    expect(policies[0]).toMatch(/for select to authenticated/);
  });

  it.each(USER_TABLES)("restricts %s to its owner via auth.uid()", (table) => {
    const policies = findPolicies(sql, table);
    expect(policies.length).toBeGreaterThan(0);
    policies.forEach((policy) => expect(policy).toContain("auth.uid()"));
  });

  it("prevents users from changing their own role", () => {
    expect(sql).toContain("revoke update on public.profiles from authenticated");
    expect(sql).toContain("grant update (display_name) on public.profiles to authenticated");
  });
});

describe("finish_workout_session", () => {
  it("is a security invoker function executable only by authenticated users", () => {
    const sql = readAllMigrations();
    const definition = sql.slice(sql.indexOf("create or replace function public.finish_workout_session"));
    expect(definition).toContain("security invoker");
    expect(sql).toContain("revoke all on function public.finish_workout_session(uuid, timestamptz, jsonb) from public, anon");
    expect(sql).toContain("grant execute on function public.finish_workout_session(uuid, timestamptz, jsonb) to authenticated");
  });
});

describe("table privileges", () => {
  it("lets authenticated users read the catalog and their training data (RLS filters rows)", () => {
    const sql = readAllMigrations();
    for (const table of ["exercises", "exercise_media", "plans", "workouts", "workout_exercises", "profiles"]) {
      expect(sql).toMatch(new RegExp(`grant select on[^;]*public\\.${table}[,\\s][^;]*to authenticated`));
    }
    expect(sql).toContain("grant select, insert on public.workout_sessions, public.set_logs to authenticated");
    expect(sql).toContain("grant update (track_progression) on public.workout_exercises to authenticated");
    expect(sql).not.toMatch(/grant [^;]* to anon/);
  });
});

describe("latest_set_loads", () => {
  it("is a security invoker function executable only by authenticated users", () => {
    const sql = readAllMigrations();
    expect(sql.slice(sql.indexOf("create or replace function public.latest_set_loads"))).toContain("security invoker");
    expect(sql).toContain("revoke all on function public.latest_set_loads(uuid[]) from public, anon");
    expect(sql).toContain("grant execute on function public.latest_set_loads(uuid[]) to authenticated");
  });
});
