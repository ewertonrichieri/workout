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
