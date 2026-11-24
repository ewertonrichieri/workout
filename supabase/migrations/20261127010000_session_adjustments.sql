-- Daily adjustment by AI (spec 012, step 3B.2).
-- What the user accepted for today's workout, per prescription; the plan itself never changes.

create table public.session_adjustments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.readiness_checkins (id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  change_type text not null check (change_type in ('reduced', 'removed', 'replaced')),
  replacement_exercise_id uuid references public.exercises (id) on delete restrict,
  sets integer check (sets > 0),
  reps_min integer check (reps_min > 0),
  reps_max integer,
  reason text not null check (char_length(reason) between 1 and 300),
  unique (checkin_id, workout_exercise_id),
  check ((change_type = 'replaced') = (replacement_exercise_id is not null)),
  check (
    (change_type = 'removed' and sets is null and reps_min is null and reps_max is null)
    or (change_type <> 'removed' and sets is not null and reps_min is not null and reps_max >= reps_min))
);
create index session_adjustments_workout_exercise_id_idx on public.session_adjustments (workout_exercise_id);

alter table public.session_adjustments enable row level security;

create policy "session_adjustments_owner" on public.session_adjustments
  for all to authenticated
  using (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())));

grant select, insert, delete on public.session_adjustments to authenticated;

-- Muscles and equipment of the given exercises, same shape as list_plan_candidates (prompt of 3B.2).
create or replace function public.list_exercise_profiles(p_slugs text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', e.slug,
      'primary_muscles', array(
        select m.slug from public.exercise_muscles em
        join public.muscles m on m.id = em.muscle_id
        where em.exercise_id = e.id and em.muscle_role = 'primary'
        order by m.slug),
      'equipment', array(
        select q.slug from public.exercise_equipment ee
        join public.equipment q on q.id = ee.equipment_id
        where ee.exercise_id = e.id
        order by q.slug)
    ) order by e.slug), '[]'::jsonb)
  from public.exercises e
  where e.slug = any (p_slugs);
$$;

revoke all on function public.list_exercise_profiles(text[]) from public, anon;
grant execute on function public.list_exercise_profiles(text[]) to authenticated;

-- Replaces every adjustment of a check-in in one transaction ('[]' = back to the original workout).
-- Caller's rights (RLS). Prescriptions must belong to the check-in's workout; replacements need media.
-- Error WK002 = the check-in already has a finished session (nothing changes after finishing).
create or replace function public.save_session_adjustments(p_checkin_id uuid, p_changes jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workout_id uuid;
  v_inserted integer;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'save_session_adjustments: changes must be an array' using errcode = '22023';
  end if;
  select c.workout_id into v_workout_id from public.readiness_checkins c where c.id = p_checkin_id;
  if v_workout_id is null then
    raise exception 'save_session_adjustments: check-in not found' using errcode = '22023';
  end if;
  if exists (select 1 from public.workout_sessions ws where ws.readiness_checkin_id = p_checkin_id) then
    raise exception 'save_session_adjustments: workout already finished' using errcode = 'WK002';
  end if;

  delete from public.session_adjustments where checkin_id = p_checkin_id;

  insert into public.session_adjustments
    (checkin_id, workout_exercise_id, change_type, replacement_exercise_id, sets, reps_min, reps_max, reason)
  select p_checkin_id, we.id, x.change_type, r.id, x.sets, x.reps_min, x.reps_max, x.reason
  from jsonb_to_recordset(p_changes) as x (
      workout_exercise_id uuid, change_type text, replacement_slug text,
      sets integer, reps_min integer, reps_max integer, reason text)
  join public.workout_exercises we on we.id = x.workout_exercise_id and we.workout_id = v_workout_id
  left join public.exercises r on r.slug = x.replacement_slug
    and exists (select 1 from public.exercise_media md where md.exercise_id = r.id and md.is_enabled)
  where (x.replacement_slug is null) = (r.id is null);

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_changes) then
    raise exception 'save_session_adjustments: changes do not match the workout' using errcode = '22023';
  end if;
  return v_inserted;
end;
$$;

revoke all on function public.save_session_adjustments(uuid, jsonb) from public, anon;
grant execute on function public.save_session_adjustments(uuid, jsonb) to authenticated;

-- "Finalizar treino" follows the adjustments of the check-in: no sets for removed exercises,
-- the adjusted number of sets, and the replacement exercise in set_logs (from the database).
create or replace function public.finish_workout_session(
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
  select v_session_id, coalesce(a.replacement_exercise_id, we.exercise_id), we.id, s.set_number, s.load_kg, s.reps_done
  from jsonb_to_recordset(p_sets) as s (workout_exercise_id uuid, set_number integer, load_kg numeric, reps_done integer)
  join public.workout_exercises we
    on we.id = s.workout_exercise_id
   and we.workout_id = p_workout_id
  left join public.session_adjustments a
    on a.checkin_id = p_readiness_checkin_id
   and a.workout_exercise_id = we.id
  where a.change_type is distinct from 'removed'
    and s.set_number <= coalesce(a.sets, we.sets);

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_sets) then
    raise exception 'finish_workout_session: sets do not match the workout' using errcode = '22023';
  end if;

  return v_session_id;
end;
$$;
