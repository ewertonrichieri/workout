-- Pre-workout check-in (spec 012, step 3B.1).
-- One check-in per workout start; pains are normalized (no row = no pain).
-- The finished session points to the check-in of that day.

create table public.readiness_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  sleep_quality text not null check (sleep_quality in ('poor', 'ok', 'good')),
  energy_level text not null check (energy_level in ('low', 'normal', 'high')),
  available_minutes integer not null check (available_minutes between 10 and 240),
  created_at timestamptz not null default now()
);
create index readiness_checkins_user_created_idx on public.readiness_checkins (user_id, created_at desc);
create index readiness_checkins_workout_id_idx on public.readiness_checkins (workout_id);

create table public.readiness_checkin_pains (
  checkin_id uuid not null references public.readiness_checkins (id) on delete cascade,
  body_region text not null check (body_region in (
    'neck', 'shoulders', 'upper_back', 'lower_back', 'chest', 'elbows', 'wrists', 'hips', 'knees', 'ankles')),
  intensity text not null check (intensity in ('mild', 'moderate', 'severe')),
  primary key (checkin_id, body_region)
);

alter table public.readiness_checkins enable row level security;
alter table public.readiness_checkin_pains enable row level security;

create policy "readiness_checkins_owner" on public.readiness_checkins
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "readiness_checkin_pains_owner" on public.readiness_checkin_pains
  for all to authenticated
  using (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())));

grant select, insert on public.readiness_checkins, public.readiness_checkin_pains to authenticated;

-- A check-in belongs to at most one finished session.
alter table public.workout_sessions
  add column readiness_checkin_id uuid references public.readiness_checkins (id) on delete set null;
create unique index workout_sessions_readiness_checkin_id_key
  on public.workout_sessions (readiness_checkin_id) where readiness_checkin_id is not null;

-- Saves a check-in and its pains in one transaction, with the caller's rights (RLS applies).
-- The workout must be visible to the caller (RLS on workouts); FKs alone would not check that.
create or replace function public.save_readiness_checkin(
  p_workout_id uuid,
  p_sleep_quality text,
  p_energy_level text,
  p_available_minutes integer,
  p_pains jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_checkin_id uuid;
begin
  if jsonb_typeof(p_pains) is distinct from 'array' then
    raise exception 'save_readiness_checkin: pains must be an array' using errcode = '22023';
  end if;
  if not exists (select 1 from public.workouts w where w.id = p_workout_id) then
    raise exception 'save_readiness_checkin: workout not found' using errcode = '22023';
  end if;

  insert into public.readiness_checkins (user_id, workout_id, sleep_quality, energy_level, available_minutes)
  values ((select auth.uid()), p_workout_id, p_sleep_quality, p_energy_level, p_available_minutes)
  returning id into v_checkin_id;

  insert into public.readiness_checkin_pains (checkin_id, body_region, intensity)
  select v_checkin_id, p.body_region, p.intensity
  from jsonb_to_recordset(p_pains) as p (body_region text, intensity text);

  return v_checkin_id;
end;
$$;

revoke all on function public.save_readiness_checkin(uuid, text, text, integer, jsonb) from public, anon;
grant execute on function public.save_readiness_checkin(uuid, text, text, integer, jsonb) to authenticated;

-- "Finalizar treino" now links the check-in of the day (optional).
drop function public.finish_workout_session(uuid, timestamptz, jsonb);

create function public.finish_workout_session(
  p_workout_id uuid,
  p_started_at timestamptz,
  p_sets jsonb,
  p_readiness_checkin_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_inserted integer;
begin
  if jsonb_typeof(p_sets) is distinct from 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'finish_workout_session: at least one set is required' using errcode = '22023';
  end if;
  if p_readiness_checkin_id is not null and not exists (
    select 1 from public.readiness_checkins c
    where c.id = p_readiness_checkin_id and c.workout_id = p_workout_id) then
    raise exception 'finish_workout_session: check-in does not match the workout' using errcode = '22023';
  end if;

  insert into public.workout_sessions (user_id, workout_id, started_at, finished_at, readiness_checkin_id)
  values ((select auth.uid()), p_workout_id, least(p_started_at, now()), now(), p_readiness_checkin_id)
  returning id into v_session_id;

  insert into public.set_logs (session_id, exercise_id, workout_exercise_id, set_number, load_kg, reps_done)
  select v_session_id, we.exercise_id, we.id, s.set_number, s.load_kg, s.reps_done
  from jsonb_to_recordset(p_sets) as s (workout_exercise_id uuid, set_number integer, load_kg numeric, reps_done integer)
  join public.workout_exercises we
    on we.id = s.workout_exercise_id
   and we.workout_id = p_workout_id
   and s.set_number <= we.sets;

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_sets) then
    raise exception 'finish_workout_session: sets do not match the workout' using errcode = '22023';
  end if;

  return v_session_id;
end;
$$;

revoke all on function public.finish_workout_session(uuid, timestamptz, jsonb, uuid) from public, anon;
grant execute on function public.finish_workout_session(uuid, timestamptz, jsonb, uuid) to authenticated;
