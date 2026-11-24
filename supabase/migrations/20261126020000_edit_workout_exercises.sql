-- Manual editing of a workout of the active plan (spec 011, step 3.4).
-- Replaces the workout's exercise list in one transaction with the caller's rights (RLS applies):
-- kept items (same id and same exercise) are updated, missing ones deleted, items without id inserted,
-- all in the order sent. Logged sets of deleted items stay (set_logs.workout_exercise_id becomes null).
-- Error WK002 = workout not in the caller's active plan; 22023 = exercises do not match.
create or replace function public.save_workout_exercises(p_workout_id uuid, p_exercises jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expected integer;
  v_matched integer;
begin
  if jsonb_typeof(p_exercises) is distinct from 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'save_workout_exercises: at least one exercise is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.workouts w join public.plans p on p.id = w.plan_id
    where w.id = p_workout_id and p.status = 'active' and p.user_id = (select auth.uid())
  ) then
    raise exception 'save_workout_exercises: workout not found' using errcode = 'WK002';
  end if;

  v_expected := jsonb_array_length(p_exercises);

  select count(*) into v_matched
  from jsonb_to_recordset(p_exercises) as x (exercise_slug text)
  join public.exercises e on e.slug = x.exercise_slug
  where exists (select 1 from public.exercise_media md where md.exercise_id = e.id and md.is_enabled);

  if v_matched <> v_expected or exists (
    select 1 from jsonb_to_recordset(p_exercises) as x (id uuid, exercise_slug text)
    where x.id is not null and not exists (
      select 1 from public.workout_exercises we
      join public.exercises e on e.id = we.exercise_id
      where we.id = x.id and we.workout_id = p_workout_id and e.slug = x.exercise_slug)
  ) then
    raise exception 'save_workout_exercises: exercises do not match' using errcode = '22023';
  end if;

  delete from public.workout_exercises we
  where we.workout_id = p_workout_id
    and we.id not in (select x.id from jsonb_to_recordset(p_exercises) as x (id uuid) where x.id is not null);

  update public.workout_exercises we
  set category = x.category, position = x.position, sets = x.sets, reps_min = x.reps_min,
      reps_max = x.reps_max, rest_seconds = x.rest_seconds, notes = x.notes
  from rows from (jsonb_to_recordset(p_exercises) as (
      id uuid, exercise_slug text, category text, sets integer, reps_min integer, reps_max integer,
      rest_seconds integer, notes text))
    with ordinality as x (id, exercise_slug, category, sets, reps_min, reps_max, rest_seconds, notes, position)
  where we.id = x.id and we.workout_id = p_workout_id;

  insert into public.workout_exercises
    (workout_id, exercise_id, category, position, sets, reps_min, reps_max, rest_seconds, notes)
  select p_workout_id, e.id, x.category, x.position, x.sets, x.reps_min, x.reps_max, x.rest_seconds, x.notes
  from rows from (jsonb_to_recordset(p_exercises) as (
      id uuid, exercise_slug text, category text, sets integer, reps_min integer, reps_max integer,
      rest_seconds integer, notes text))
    with ordinality as x (id, exercise_slug, category, sets, reps_min, reps_max, rest_seconds, notes, position)
  join public.exercises e on e.slug = x.exercise_slug
  where x.id is null;
end;
$$;

revoke all on function public.save_workout_exercises(uuid, jsonb) from public, anon;
grant execute on function public.save_workout_exercises(uuid, jsonb) to authenticated;

grant update (category, position, sets, reps_min, reps_max, rest_seconds, notes) on public.workout_exercises to authenticated;
grant delete on public.workout_exercises to authenticated;
