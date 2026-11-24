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
  "readiness_checkins",
  "readiness_checkin_pains",
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

describe("readiness check-in (step 3B.1)", () => {
  const sql = readAllMigrations();

  it("saves check-ins through a security invoker function executable only by authenticated users", () => {
    const definition = sql.slice(sql.indexOf("create or replace function public.save_readiness_checkin"));
    expect(definition).toContain("security invoker");
    expect(sql).toContain("revoke all on function public.save_readiness_checkin(uuid, text, text, integer, jsonb) from public, anon");
    expect(sql).toContain("grant execute on function public.save_readiness_checkin(uuid, text, text, integer, jsonb) to authenticated");
    expect(sql).toContain("grant select, insert on public.readiness_checkins, public.readiness_checkin_pains to authenticated");
  });

  it("links the finished session to the check-in", () => {
    const definition = sql.slice(sql.lastIndexOf("create function public.finish_workout_session"));
    expect(definition).toContain("p_readiness_checkin_id uuid default null");
    expect(definition).toContain("security invoker");
    expect(sql).toContain("grant execute on function public.finish_workout_session(uuid, timestamptz, jsonb, uuid) to authenticated");
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

describe("assessments (step 3.1)", () => {
  const SAVE_SIGNATURE = "public.save_assessment(text, text, integer, integer, text, text, text[])";

  it("stores the split preference with the domain values", () => {
    const sql = readAllMigrations();
    expect(sql).toMatch(/add column split_preference text not null default 'ai_decides'\s+check \(split_preference in \('ai_decides', 'full_body', 'split'\)\)/);
  });

  it("saves through a security invoker function executable only by authenticated users", () => {
    const sql = readAllMigrations();
    expect(sql.slice(sql.indexOf("create or replace function public.save_assessment"))).toContain("security invoker");
    expect(sql).toContain(`revoke all on function ${SAVE_SIGNATURE} from public, anon`);
    expect(sql).toContain(`grant execute on function ${SAVE_SIGNATURE} to authenticated`);
  });

  it("lets authenticated users read and insert their assessments (RLS filters rows)", () => {
    expect(readAllMigrations()).toContain("grant select, insert on public.assessments, public.assessment_equipment to authenticated");
  });
});

describe("generated plans (step 3.3)", () => {
  const CREATE_SIGNATURE = "public.create_generated_plan(uuid, text, date, date, boolean, jsonb)";
  const CANDIDATES_SIGNATURE = "public.list_plan_candidates(text[])";

  it("creates and lists through security invoker functions executable only by authenticated users", () => {
    const sql = readAllMigrations();
    for (const [name, signature] of [["create_generated_plan", CREATE_SIGNATURE], ["list_plan_candidates", CANDIDATES_SIGNATURE]]) {
      const definition = sql.slice(sql.indexOf(`create or replace function public.${name}`));
      expect(definition.slice(0, definition.indexOf("$$;"))).toContain("security invoker");
      expect(sql).toContain(`revoke all on function ${signature} from public, anon`);
      expect(sql).toContain(`grant execute on function ${signature} to authenticated`);
    }
  });

  it("lets authenticated users write their plans (RLS filters rows) and only archive old ones", () => {
    const sql = readAllMigrations();
    expect(sql).toContain("grant insert on public.plans, public.workouts, public.workout_exercises to authenticated");
    expect(sql).toContain("grant update (status) on public.plans to authenticated");
  });
});

describe("workout editing (step 3.4)", () => {
  const SAVE_SIGNATURE = "public.save_workout_exercises(uuid, jsonb)";

  it("saves through a security invoker function executable only by authenticated users", () => {
    const sql = readAllMigrations();
    const definition = sql.slice(sql.indexOf("create or replace function public.save_workout_exercises"));
    expect(definition.slice(0, definition.indexOf("$$;"))).toContain("security invoker");
    expect(sql).toContain(`revoke all on function ${SAVE_SIGNATURE} from public, anon`);
    expect(sql).toContain(`grant execute on function ${SAVE_SIGNATURE} to authenticated`);
  });

  it("lets users change only the prescription columns and remove exercises (RLS filters rows)", () => {
    const sql = readAllMigrations();
    expect(sql).toContain("grant update (category, position, sets, reps_min, reps_max, rest_seconds, notes) on public.workout_exercises to authenticated");
    expect(sql).toContain("grant delete on public.workout_exercises to authenticated");
  });
});

describe("progression and renewal (steps 3.5 and 3.6)", () => {
  it("returns reps with the latest loads and summarizes a plan's history through security invoker functions", () => {
    const sql = readAllMigrations();
    expect(sql).toMatch(/returns table \(exercise_id uuid, set_number integer, load_kg numeric, reps_done integer\)/);
    const summary = sql.slice(sql.indexOf("create or replace function public.plan_history_summary"));
    expect(summary.slice(0, summary.indexOf("$$;"))).toContain("security invoker");
    expect(sql).toContain("revoke all on function public.plan_history_summary(uuid) from public, anon");
    expect(sql).toContain("grant execute on function public.plan_history_summary(uuid) to authenticated");
  });
});
