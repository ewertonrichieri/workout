-- Perceived effort per set (spec 012, step 3B.3): "fácil / ok / no limite", optional.
-- Saved when finishing and returned with the latest loads for the autoregulation rule (decision D5).

alter table public.set_logs
  add column effort text check (effort in ('easy', 'ok', 'max'));

-- Same as step 3B.2, now also saving the effort of each set (null when not marked).
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

  insert into public.set_logs (session_id, exercise_id, workout_exercise_id, set_number, load_kg, reps_done, effort)
  select v_session_id, coalesce(a.replacement_exercise_id, we.exercise_id), we.id, s.set_number, s.load_kg, s.reps_done, s.effort
  from jsonb_to_recordset(p_sets) as s (workout_exercise_id uuid, set_number integer, load_kg numeric, reps_done integer, effort text)
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

-- Latest loads now come with the effort of each set.
drop function if exists public.latest_set_loads(uuid[]);

create function public.latest_set_loads(p_exercise_ids uuid[])
returns table (exercise_id uuid, set_number integer, load_kg numeric, reps_done integer, effort text)
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
  select sl.exercise_id, sl.set_number, sl.load_kg, sl.reps_done, sl.effort
  from public.set_logs sl
  join latest_session ls on ls.session_id = sl.session_id and ls.exercise_id = sl.exercise_id
  where sl.load_kg is not null
  order by sl.exercise_id, sl.set_number;
$$;

revoke all on function public.latest_set_loads(uuid[]) from public, anon;
grant execute on function public.latest_set_loads(uuid[]) to authenticated;
