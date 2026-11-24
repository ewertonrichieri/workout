-- "Finalizar treino" (spec 010, step 2.6): session and its sets saved in one transaction.
-- Runs with the caller's rights, so RLS on workout_sessions, set_logs and workout_exercises applies.
-- exercise_id comes from the prescription, never from the client.
create or replace function public.finish_workout_session(
  p_workout_id uuid,
  p_started_at timestamptz,
  p_sets jsonb
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

  insert into public.workout_sessions (user_id, workout_id, started_at, finished_at)
  values ((select auth.uid()), p_workout_id, least(p_started_at, now()), now())
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

revoke all on function public.finish_workout_session(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.finish_workout_session(uuid, timestamptz, jsonb) to authenticated;
