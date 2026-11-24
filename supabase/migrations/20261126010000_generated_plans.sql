-- Plan generation by AI (spec 011, step 3.3).

-- Exercises the AI may choose: enabled media and every equipment item among the user's.
-- Returns one jsonb array (not a set) so the Data API row limit cannot cut the catalog.
create or replace function public.list_plan_candidates(p_equipment_slugs text[])
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
  where exists (select 1 from public.exercise_media md where md.exercise_id = e.id and md.is_enabled)
    and exists (select 1 from public.exercise_equipment ee where ee.exercise_id = e.id)
    and not exists (
      select 1 from public.exercise_equipment ee
      join public.equipment q on q.id = ee.equipment_id
      where ee.exercise_id = e.id and not (q.slug = any (p_equipment_slugs)));
$$;

revoke all on function public.list_plan_candidates(text[]) from public, anon;
grant execute on function public.list_plan_candidates(text[]) to authenticated;

-- Saves a generated plan, its workouts and exercises in one transaction, with the caller's rights
-- (RLS applies). An active plan is archived only when the user confirmed the replacement.
-- Error WK001 = active plan exists without confirmation; 22023 = exercises do not match the catalog.
create or replace function public.create_generated_plan(
  p_assessment_id uuid,
  p_goal text,
  p_starts_on date,
  p_valid_until date,
  p_replace_active boolean,
  p_workouts jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_plan_id uuid;
  v_workout_id uuid;
  v_workout jsonb;
  v_position bigint;
  v_expected integer;
  v_inserted integer;
begin
  if jsonb_typeof(p_workouts) is distinct from 'array' or jsonb_array_length(p_workouts) = 0 then
    raise exception 'create_generated_plan: at least one workout is required' using errcode = '22023';
  end if;

  if exists (select 1 from public.plans where user_id = v_user_id and status = 'active') then
    if not p_replace_active then
      raise exception 'create_generated_plan: active plan exists' using errcode = 'WK001';
    end if;
    update public.plans set status = 'archived' where user_id = v_user_id and status = 'active';
  end if;

  insert into public.plans (user_id, assessment_id, goal, origin, status, starts_on, valid_until)
  values (v_user_id, p_assessment_id, p_goal, 'ai', 'active', p_starts_on, p_valid_until)
  returning id into v_plan_id;

  for v_workout, v_position in
    select w.value, w.ordinality from jsonb_array_elements(p_workouts) with ordinality as w
  loop
    insert into public.workouts (plan_id, label, position)
    values (v_plan_id, v_workout ->> 'label', v_position)
    returning id into v_workout_id;

    v_expected := coalesce(jsonb_array_length(v_workout -> 'exercises'), 0);

    insert into public.workout_exercises
      (workout_id, exercise_id, category, position, sets, reps_min, reps_max, rest_seconds, notes)
    select v_workout_id, e.id, x.category, x.position, x.sets, x.reps_min, x.reps_max, x.rest_seconds, x.notes
    from rows from (jsonb_to_recordset(v_workout -> 'exercises') as (
        exercise_slug text, category text, sets integer, reps_min integer, reps_max integer,
        rest_seconds integer, notes text))
      with ordinality as x (exercise_slug, category, sets, reps_min, reps_max, rest_seconds, notes, position)
    join public.exercises e on e.slug = x.exercise_slug
    where exists (select 1 from public.exercise_media md where md.exercise_id = e.id and md.is_enabled);

    get diagnostics v_inserted = row_count;
    if v_expected = 0 or v_inserted <> v_expected then
      raise exception 'create_generated_plan: exercises do not match the catalog' using errcode = '22023';
    end if;
  end loop;

  return v_plan_id;
end;
$$;

revoke all on function public.create_generated_plan(uuid, text, date, date, boolean, jsonb) from public, anon;
grant execute on function public.create_generated_plan(uuid, text, date, date, boolean, jsonb) to authenticated;

grant insert on public.plans, public.workouts, public.workout_exercises to authenticated;
-- Generating a new plan archives the previous one; no other plan column is updated by the app.
grant update (status) on public.plans to authenticated;
