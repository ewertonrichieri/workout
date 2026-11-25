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
  "session_adjustments",
  "exercise_substitutions",
  "ai_requests",
  "adjustment_proposals",
  "adjustment_proposal_changes",
  "substitution_caches",
  "substitution_cache_choices",
  "technique_analyses",
  "technique_reps",
  "technique_rep_issues",
  "technique_analysis_feedback",
  "technique_rep_metrics",
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

/** Text of the newest `create [or replace] function public.<name>(`, up to the end of the migrations. */
function latestDefinition(sql: string, name: string): string {
  const start = Math.max(sql.lastIndexOf(`create function public.${name}(`), sql.lastIndexOf(`create or replace function public.${name}(`));
  return sql.slice(start);
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

describe("daily adjustment (step 3B.2)", () => {
  const sql = readAllMigrations();

  it.each(["save_session_adjustments(uuid, jsonb)", "list_exercise_profiles(text[])"])("%s is executable only by authenticated users", (signature) => {
    const name = signature.slice(0, signature.indexOf("("));
    expect(sql.slice(sql.indexOf(`create or replace function public.${name}`))).toContain("security invoker");
    expect(sql).toContain(`revoke all on function public.${signature} from public, anon`);
    expect(sql).toContain(`grant execute on function public.${signature} to authenticated`);
  });

  it("lets the owner replace adjustments and makes finishing follow them", () => {
    expect(sql).toContain("grant select, insert, delete on public.session_adjustments to authenticated");
    const finish = latestDefinition(sql, "finish_workout_session");
    expect(finish).toContain("a.replacement_exercise_id");
    expect(finish).toContain("a.change_type is distinct from 'removed'");
  });
});

describe("set effort (step 3B.3)", () => {
  it("saves the effort when finishing and returns it with the latest loads", () => {
    const sql = readAllMigrations();
    expect(sql).toContain("add column effort text check (effort in ('easy', 'ok', 'max'))");
    const finish = latestDefinition(sql, "finish_workout_session");
    expect(finish).toContain("s.effort");
    const latest = sql.slice(sql.lastIndexOf("create function public.latest_set_loads"));
    expect(latest).toContain("sl.effort");
    expect(latest).toContain("security invoker");
  });
});

describe("exercise substitution (step 3B.4)", () => {
  const sql = readAllMigrations();

  it.each(["list_substitution_candidates(text, text[])", "save_exercise_substitutions(uuid, uuid, uuid, jsonb)", "finish_workout_session(uuid, timestamptz, jsonb, uuid, jsonb)"])(
    "%s is executable only by authenticated users",
    (signature) => {
      expect(sql).toContain(`revoke all on function public.${signature} from public, anon`);
      expect(sql).toContain(`grant execute on function public.${signature} to authenticated`);
    },
  );

  it("logs the substitute exercise from the database when finishing", () => {
    const finish = latestDefinition(sql, "finish_workout_session");
    expect(finish).toContain("p_substitutions jsonb default '[]'::jsonb");
    expect(finish).toContain("coalesce(es.replacement_exercise_id, a.replacement_exercise_id, we.exercise_id)");
    expect(finish).toContain("s.effort");
    expect(finish).toContain("security invoker");
  });
});

describe("AI cost control (2026-11-24)", () => {
  const sql = readAllMigrations();

  it.each(["register_ai_request(text, integer, integer)", "save_adjustment_proposal(uuid, text, integer, jsonb)"])("%s is executable only by authenticated users", (signature) => {
    const name = signature.slice(0, signature.indexOf("("));
    expect(latestDefinition(sql, name)).toContain("security invoker");
    expect(sql).toContain(`revoke all on function public.${signature} from public, anon`);
    expect(sql).toContain(`grant execute on function public.${signature} to authenticated`);
  });

  it("never lets users update or delete their AI request records (the limit cannot be reset)", () => {
    expect(sql).toContain("grant select, insert on public.ai_requests to authenticated");
    expect(sql).not.toMatch(/grant [^;]*(update|delete)[^;]* on public\.ai_requests/);
  });

  it("counts and registers a request under a per-user lock", () => {
    const register = latestDefinition(sql, "register_ai_request");
    expect(register).toContain("pg_advisory_xact_lock");
    expect(register).toContain("(select auth.uid())");
  });

  it("keeps the saved proposal read-only for the owner", () => {
    expect(sql).toContain("grant select, insert on public.adjustment_proposals, public.adjustment_proposal_changes to authenticated");
  });
});

describe("substitution cache (SUB-001)", () => {
  const sql = readAllMigrations();

  it.each(["find_substitution_cache(text)", "save_substitution_cache(text, jsonb)"])("%s is executable only by authenticated users", (signature) => {
    const name = signature.slice(0, signature.indexOf("("));
    expect(latestDefinition(sql, name)).toContain("security invoker");
    expect(sql).toContain(`revoke all on function public.${signature} from public, anon`);
    expect(sql).toContain(`grant execute on function public.${signature} to authenticated`);
  });

  it("keeps each user's cache private and read-only once saved", () => {
    expect(sql).toContain("unique (user_id, cache_key)");
    expect(sql).toContain("grant select, insert on public.substitution_caches, public.substitution_cache_choices to authenticated");
    expect(latestDefinition(sql, "find_substitution_cache")).toContain("c.user_id = (select auth.uid())");
  });
});

describe("equipment detection limit (spec 013)", () => {
  it("accepts the detection among the limited AI operations", () => {
    const sql = readAllMigrations();
    const lastCheck = sql.slice(sql.lastIndexOf("constraint ai_requests_operation_check"));
    expect(lastCheck).toContain("'equipment.detect'");
    expect(lastCheck).toContain("'plan.generate'");
    expect(lastCheck).toContain("'readiness.adjust'");
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
