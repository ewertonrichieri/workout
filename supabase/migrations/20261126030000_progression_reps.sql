-- Load progression (spec 010, step 3.5): the latest loads now come with the reps done,
-- so the app can tell when every set reached the top of the prescribed range.
drop function if exists public.latest_set_loads(uuid[]);

create function public.latest_set_loads(p_exercise_ids uuid[])
returns table (exercise_id uuid, set_number integer, load_kg numeric, reps_done integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest_session as (
    select distinct on (sl.exercise_id) sl.exercise_id, sl.session_id
    from public.set_logs sl
    join public.workout_sessions ws on ws.id = sl.session_id
    where sl.exercise_id = any (p_exercise_ids)
      and sl.load_kg is not null
      and ws.finished_at is not null
    order by sl.exercise_id, ws.finished_at desc
  )
  select sl.exercise_id, sl.set_number, sl.load_kg, sl.reps_done
  from public.set_logs sl
  join latest_session ls on ls.session_id = sl.session_id and ls.exercise_id = sl.exercise_id
  where sl.load_kg is not null
  order by sl.exercise_id, sl.set_number;
$$;

revoke all on function public.latest_set_loads(uuid[]) from public, anon;
grant execute on function public.latest_set_loads(uuid[]) to authenticated;

-- Plan renewal (spec 011, step 3.6): history of a plan for the AI, as one jsonb.
-- Finished sessions of the plan's workouts and, per exercise (slug), sessions done, heaviest load of
-- the first and the last session, and reps at the heaviest load of the last one. Caller's rights (RLS).
create or replace function public.plan_history_summary(p_plan_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with plan_sessions as (
    select ws.id, ws.finished_at
    from public.workout_sessions ws
    join public.workouts w on w.id = ws.workout_id
    where w.plan_id = p_plan_id and ws.finished_at is not null
  ),
  per_session as (
    select e.slug, ps.finished_at, max(sl.load_kg) as max_load_kg,
      (array_agg(sl.reps_done order by sl.load_kg desc nulls last, sl.set_number))[1] as reps_at_max
    from public.set_logs sl
    join plan_sessions ps on ps.id = sl.session_id
    join public.exercises e on e.id = sl.exercise_id
    group by e.slug, ps.id, ps.finished_at
  ),
  per_exercise as (
    select slug, count(*) as sessions,
      (array_agg(max_load_kg order by finished_at))[1] as first_max_load_kg,
      (array_agg(max_load_kg order by finished_at desc))[1] as last_max_load_kg,
      (array_agg(reps_at_max order by finished_at desc))[1] as last_reps
    from per_session
    group by slug
  )
  select jsonb_build_object(
    'sessions', (select count(*) from plan_sessions),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', slug, 'sessions', sessions, 'first_max_load_kg', first_max_load_kg,
        'last_max_load_kg', last_max_load_kg, 'last_reps', last_reps) order by slug)
      from per_exercise), '[]'::jsonb));
$$;

revoke all on function public.plan_history_summary(uuid) from public, anon;
grant execute on function public.plan_history_summary(uuid) to authenticated;
