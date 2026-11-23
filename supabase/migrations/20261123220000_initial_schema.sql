-- Initial MVP schema (spec docs/specs/006-schema-inicial-rls.md).
-- Every table has RLS. Catalog: read-only for authenticated users (writes via service role).
-- User data: owner-only access through auth.uid().

-- =========================================================
-- Profiles (1:1 with auth.users)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student', 'trainer', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users may change their name, never their role.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Exercise catalog (global)
-- =========================================================
create table public.muscles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_pt text not null
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_pt text not null
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_pt text not null,
  name_en text,
  movement_pattern text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  instructions_pt text,
  created_at timestamptz not null default now()
);

create table public.exercise_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_id uuid not null references public.muscles (id) on delete cascade,
  muscle_role text not null check (muscle_role in ('primary', 'secondary')),
  primary key (exercise_id, muscle_id)
);
create index exercise_muscles_muscle_id_idx on public.exercise_muscles (muscle_id);

create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  primary key (exercise_id, equipment_id)
);
create index exercise_equipment_equipment_id_idx on public.exercise_equipment (equipment_id);

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  media_type text not null check (media_type in ('video', 'gif', 'image', 'youtube')),
  url text not null,
  thumbnail_url text,
  source text not null,
  license text not null,
  priority integer not null default 100,
  is_enabled boolean not null default true,
  unique (exercise_id, url)
);
create index exercise_media_exercise_priority_idx on public.exercise_media (exercise_id, priority);

alter table public.muscles enable row level security;
alter table public.equipment enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.exercise_media enable row level security;

create policy "muscles_read" on public.muscles for select to authenticated using (true);
create policy "equipment_read" on public.equipment for select to authenticated using (true);
create policy "exercises_read" on public.exercises for select to authenticated using (true);
create policy "exercise_muscles_read" on public.exercise_muscles for select to authenticated using (true);
create policy "exercise_equipment_read" on public.exercise_equipment for select to authenticated using (true);
create policy "exercise_media_read" on public.exercise_media for select to authenticated using (true);

-- =========================================================
-- Assessments (anamnese)
-- =========================================================
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal text not null check (goal in ('hypertrophy', 'weight_loss', 'strength', 'conditioning')),
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  days_per_week integer not null check (days_per_week between 1 and 7),
  session_minutes integer not null check (session_minutes > 0),
  limitations text,
  created_at timestamptz not null default now()
);
create index assessments_user_id_idx on public.assessments (user_id);

create table public.assessment_equipment (
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  primary key (assessment_id, equipment_id)
);

alter table public.assessments enable row level security;
alter table public.assessment_equipment enable row level security;

create policy "assessments_owner" on public.assessments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "assessment_equipment_owner" on public.assessment_equipment
  for all to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and a.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and a.user_id = (select auth.uid())));

-- =========================================================
-- Plans, workouts and prescribed exercises
-- =========================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete set null,
  goal text not null check (goal in ('hypertrophy', 'weight_loss', 'strength', 'conditioning')),
  origin text not null check (origin in ('ai', 'manual')),
  status text not null default 'active' check (status in ('active', 'archived')),
  starts_on date not null default current_date,
  valid_until date not null,
  created_at timestamptz not null default now(),
  check (valid_until > starts_on)
);
create index plans_user_id_idx on public.plans (user_id);
create unique index plans_one_active_per_user_idx on public.plans (user_id) where status = 'active';

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  label text not null,
  position integer not null,
  unique (plan_id, label)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  category text,
  position integer not null,
  sets integer not null check (sets > 0),
  reps_min integer not null check (reps_min > 0),
  reps_max integer not null,
  rest_seconds integer check (rest_seconds >= 0),
  notes text,
  track_progression boolean not null default false,
  check (reps_max >= reps_min)
);
create index workout_exercises_workout_id_idx on public.workout_exercises (workout_id);
create index workout_exercises_exercise_id_idx on public.workout_exercises (exercise_id);

alter table public.plans enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;

create policy "plans_owner" on public.plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workouts_owner" on public.workouts
  for all to authenticated
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.user_id = (select auth.uid())));

create policy "workout_exercises_owner" on public.workout_exercises
  for all to authenticated
  using (exists (
    select 1 from public.workouts w join public.plans p on p.id = w.plan_id
    where w.id = workout_id and p.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.workouts w join public.plans p on p.id = w.plan_id
    where w.id = workout_id and p.user_id = (select auth.uid())));

-- =========================================================
-- Execution history (sessions and logged sets)
-- =========================================================
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (finished_at is null or finished_at >= started_at)
);
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  set_number integer not null check (set_number > 0),
  load_kg numeric(6, 2) check (load_kg >= 0),
  reps_done integer check (reps_done >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, set_number)
);
create index set_logs_exercise_id_idx on public.set_logs (exercise_id);

alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;

create policy "workout_sessions_owner" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "set_logs_owner" on public.set_logs
  for all to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())));
