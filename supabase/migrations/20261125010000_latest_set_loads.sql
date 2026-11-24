-- "Salvar carga para progredir" (spec 010, step 2.7): loads of the latest finished session that
-- logged a load for each exercise. Runs with the caller's rights (RLS: only the user's own logs).
create or replace function public.latest_set_loads(p_exercise_ids uuid[])
returns table (exercise_id uuid, set_number integer, load_kg numeric)
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
  select sl.exercise_id, sl.set_number, sl.load_kg
  from public.set_logs sl
  join latest_session ls on ls.session_id = sl.session_id and ls.exercise_id = sl.exercise_id
  where sl.load_kg is not null
  order by sl.exercise_id, sl.set_number;
$$;

revoke all on function public.latest_set_loads(uuid[]) from public, anon;
grant execute on function public.latest_set_loads(uuid[]) to authenticated;
