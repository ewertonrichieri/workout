-- Exercise substitution on the spot (spec 012, step 3B.4): equipment busy or broken, or another reason.
-- Valid only for that session; the plan keeps its prescription.

create table public.exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  replacement_exercise_id uuid not null references public.exercises (id) on delete restrict,
  reason text check (reason in ('equipment_busy', 'equipment_broken', 'other')),
  unique (session_id, workout_exercise_id)
);
create index exercise_substitutions_workout_exercise_id_idx on public.exercise_substitutions (workout_exercise_id);
create index exercise_substitutions_replacement_exercise_id_idx on public.exercise_substitutions (replacement_exercise_id);

alter table public.exercise_substitutions enable row level security;

create policy "exercise_substitutions_owner" on public.exercise_substitutions
  for all to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())));

grant select, insert on public.exercise_substitutions to authenticated;

-- Swap options for one planned exercise: enabled media, at least one shared primary muscle, every
-- equipment among the given ones. Also returns the planned exercise's muscles and equipment.
create or replace function public.list_substitution_candidates(p_original_slug text, p_equipment_slugs text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with profiles as (
    select e.id, e.slug,
      array(select m.slug from public.exercise_muscles em join public.muscles m on m.id = em.muscle_id
            where em.exercise_id = e.id and em.muscle_role = 'primary' order by m.slug) as primary_muscles,
      array(select m.slug from public.exercise_muscles em join public.muscles m on m.id = em.muscle_id
            where em.exercise_id = e.id and em.muscle_role = 'secondary' order by m.slug) as secondary_muscles,
      array(select q.slug from public.exercise_equipment ee join public.equipment q on q.id = ee.equipment_id
            where ee.exercise_id = e.id order by q.slug) as equipment
    from public.exercises e
  ),
  original as (select * from profiles where slug = p_original_slug)
  select jsonb_build_object(
    'original', (select jsonb_build_object('slug', o.slug, 'primary_muscles', o.primary_muscles,
                   'secondary_muscles', o.secondary_muscles, 'equipment', o.equipment) from original o),
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('slug', p.slug, 'primary_muscles', p.primary_muscles,
               'secondary_muscles', p.secondary_muscles, 'equipment', p.equipment) order by p.slug)
      from profiles p, original o
      where p.slug <> o.slug
        and p.primary_muscles && o.primary_muscles
        and cardinality(p.equipment) > 0
        and p.equipment <@ p_equipment_slugs
        and exists (select 1 from public.exercise_media md where md.exercise_id = p.id and md.is_enabled)
    ), '[]'::jsonb));
$$;

revoke all on function public.list_substitution_candidates(text, text[]) from public, anon;
grant execute on function public.list_substitution_candidates(text, text[]) to authenticated;

-- Saves the substitutions of a session being finished (called by finish_workout_session).
-- Each prescription belongs to the workout; the replacement has media, is not repeated, is not already in
-- the workout and is not today's AI replacement of another exercise; removed exercises cannot be swapped.
create or replace function public.save_exercise_substitutions(
  p_session_id uuid,
  p_workout_id uuid,
  p_readiness_checkin_id uuid,
  p_substitutions jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  insert into public.exercise_substitutions (session_id, workout_exercise_id, replacement_exercise_id, reason)
  select p_session_id, we.id, r.id, x.reason
  from jsonb_to_recordset(p_substitutions) as x (workout_exercise_id uuid, exercise_slug text, reason text)
  join public.workout_exercises we on we.id = x.workout_exercise_id and we.workout_id = p_workout_id
  join public.exercises r on r.slug = x.exercise_slug
  where exists (select 1 from public.exercise_media md where md.exercise_id = r.id and md.is_enabled)
    and not exists (select 1 from public.workout_exercises other where other.workout_id = p_workout_id and other.exercise_id = r.id)
    and not exists (select 1 from public.session_adjustments a
                    where a.checkin_id = p_readiness_checkin_id
                      and (a.replacement_exercise_id = r.id and a.workout_exercise_id <> we.id
                           or a.workout_exercise_id = we.id and a.change_type = 'removed'));

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_substitutions)
     or (select count(distinct replacement_exercise_id) from public.exercise_substitutions where session_id = p_session_id) <> v_inserted then
    raise exception 'finish_workout_session: substitutions do not match the workout' using errcode = '22023';
  end if;
end;
$$;

-- finish_workout_session runs with the caller's rights, so the caller needs to execute it too (RLS still applies).
revoke all on function public.save_exercise_substitutions(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_exercise_substitutions(uuid, uuid, uuid, jsonb) to authenticated;

-- "Finalizar treino" also saves today's substitutions and logs the replacement exercise (from the database).
drop function public.finish_workout_session(uuid, timestamptz, jsonb, uuid);

create function public.finish_workout_session(
  p_workout_id uuid,
  p_started_at timestamptz,
  p_sets jsonb,
  p_readiness_checkin_id uuid default null,
  p_substitutions jsonb default '[]'::jsonb
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
  if jsonb_typeof(p_substitutions) is distinct from 'array' then
    raise exception 'finish_workout_session: substitutions must be an array' using errcode = '22023';
  end if;
  if p_readiness_checkin_id is not null and not exists (
    select 1 from public.readiness_checkins c
    where c.id = p_readiness_checkin_id and c.workout_id = p_workout_id) then
    raise exception 'finish_workout_session: check-in does not match the workout' using errcode = '22023';
  end if;

  insert into public.workout_sessions (user_id, workout_id, started_at, finished_at, readiness_checkin_id)
  values ((select auth.uid()), p_workout_id, least(p_started_at, now()), now(), p_readiness_checkin_id)
  returning id into v_session_id;

  perform public.save_exercise_substitutions(v_session_id, p_workout_id, p_readiness_checkin_id, p_substitutions);

  insert into public.set_logs (session_id, exercise_id, workout_exercise_id, set_number, load_kg, reps_done, effort)
  select v_session_id, coalesce(es.replacement_exercise_id, a.replacement_exercise_id, we.exercise_id), we.id, s.set_number, s.load_kg, s.reps_done, s.effort
  from jsonb_to_recordset(p_sets) as s (workout_exercise_id uuid, set_number integer, load_kg numeric, reps_done integer, effort text)
  join public.workout_exercises we
    on we.id = s.workout_exercise_id
   and we.workout_id = p_workout_id
  left join public.session_adjustments a
    on a.checkin_id = p_readiness_checkin_id
   and a.workout_exercise_id = we.id
  left join public.exercise_substitutions es
    on es.session_id = v_session_id
   and es.workout_exercise_id = we.id
  where a.change_type is distinct from 'removed'
    and s.set_number <= coalesce(a.sets, we.sets);

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_sets) then
    raise exception 'finish_workout_session: sets do not match the workout' using errcode = '22023';
  end if;

  return v_session_id;
end;
$$;

revoke all on function public.finish_workout_session(uuid, timestamptz, jsonb, uuid, jsonb) from public, anon;
grant execute on function public.finish_workout_session(uuid, timestamptz, jsonb, uuid, jsonb) to authenticated;
