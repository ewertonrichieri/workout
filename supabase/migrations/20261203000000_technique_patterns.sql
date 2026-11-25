-- Spec 014, step 5.7 (decisions D13–D15): technique analysis by movement pattern (squat, hip hinge, row).
-- Each pattern has its own per-rep metrics, so they move from fixed squat columns to one row per metric.
-- technique_reps is empty when this runs (checked on 2026-11-25), so the squat columns are dropped without copying.

create table public.technique_rep_metrics (
  rep_id uuid not null references public.technique_reps (id) on delete cascade,
  metric text not null check (metric in (
    'minKneeAngle', 'minThighAngle', 'maxTrunkLean', 'maxKneeTravelRatio', 'maxHeelRiseRatio',
    'minHipAngle',
    'maxWristHeight', 'trunkRise', 'restTrunkLean', 'minElbowAngle')),
  value numeric(9, 3) not null check (value between -180 and 180),
  primary key (rep_id, metric)
);

alter table public.technique_rep_metrics enable row level security;

create policy "technique_rep_metrics_owner" on public.technique_rep_metrics
  for all to authenticated
  using (exists (
    select 1 from public.technique_reps r join public.technique_analyses a on a.id = r.analysis_id
    where r.id = rep_id and a.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.technique_reps r join public.technique_analyses a on a.id = r.analysis_id
    where r.id = rep_id and a.user_id = (select auth.uid())));

grant select, insert, delete on public.technique_rep_metrics to authenticated;

alter table public.technique_reps
  drop column min_knee_angle,
  drop column min_thigh_angle,
  drop column max_trunk_lean,
  drop column max_knee_travel_ratio,
  drop column max_heel_rise_ratio;

alter table public.technique_rep_issues
  drop constraint technique_rep_issues_issue_check,
  add constraint technique_rep_issues_issue_check check (issue in (
    'shallow_depth', 'heel_lift', 'fast_descent', 'trunk_lean', 'trunk_lean_fatigue', 'knee_forward',
    'hinge_short_range', 'hinge_knee_bend', 'hinge_squat_like', 'row_short_pull', 'row_trunk_rise', 'row_trunk_upright'));

alter table public.technique_analysis_feedback
  drop constraint technique_analysis_feedback_issue_check,
  add constraint technique_analysis_feedback_issue_check check (issue in (
    'shallow_depth', 'heel_lift', 'fast_descent', 'trunk_lean', 'trunk_lean_fatigue', 'knee_forward',
    'hinge_short_range', 'hinge_knee_bend', 'hinge_squat_like', 'row_short_pull', 'row_trunk_rise', 'row_trunk_upright'));

-- Same signature: each rep now carries "metrics" (an object of name → value) instead of fixed fields.
create or replace function public.save_technique_analysis(
  p_exercise_id uuid,
  p_camera_view text,
  p_overall_score integer,
  p_main_tip text,
  p_reps jsonb,
  p_feedback jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_analysis_id uuid;
begin
  if jsonb_typeof(p_reps) is distinct from 'array' or jsonb_array_length(p_reps) = 0 then
    raise exception 'save_technique_analysis: at least one rep is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_feedback) is distinct from 'array' then
    raise exception 'save_technique_analysis: feedback must be an array' using errcode = '22023';
  end if;

  insert into public.technique_analyses (user_id, exercise_id, camera_view, rep_count, evaluated_rep_count, overall_score, main_tip)
  values (
    (select auth.uid()), p_exercise_id, p_camera_view, jsonb_array_length(p_reps),
    (select count(*) from jsonb_array_elements(p_reps) as r (value) where (r.value ->> 'is_evaluated')::boolean),
    p_overall_score, p_main_tip)
  returning id into v_analysis_id;

  insert into public.technique_reps (analysis_id, rep_number, score, is_evaluated, duration_ms, descent_ms)
  select v_analysis_id, r.rep_number, r.score, r.is_evaluated, r.duration_ms, r.descent_ms
  from jsonb_to_recordset(p_reps) as r (rep_number integer, score integer, is_evaluated boolean, duration_ms integer, descent_ms integer);

  -- Separate statements: the RLS checks of metrics and issues must see the reps inserted above.
  insert into public.technique_rep_metrics (rep_id, metric, value)
  select tr.id, m.key, (m.value #>> '{}')::numeric
  from jsonb_array_elements(p_reps) as r (value)
  join public.technique_reps tr on tr.analysis_id = v_analysis_id and tr.rep_number = (r.value ->> 'rep_number')::integer
  cross join lateral jsonb_each(coalesce(r.value -> 'metrics', '{}'::jsonb)) as m (key, value);

  insert into public.technique_rep_issues (rep_id, issue, severity)
  select tr.id, i.issue, i.severity
  from jsonb_array_elements(p_reps) as r (value)
  join public.technique_reps tr on tr.analysis_id = v_analysis_id and tr.rep_number = (r.value ->> 'rep_number')::integer
  cross join lateral jsonb_to_recordset(coalesce(r.value -> 'issues', '[]'::jsonb)) as i (issue text, severity text);

  insert into public.technique_analysis_feedback (analysis_id, kind, position, issue, text)
  select v_analysis_id, f.kind, f.position, f.issue, f.text
  from jsonb_to_recordset(p_feedback) as f (kind text, position integer, issue text, text text);

  return v_analysis_id;
end;
$$;
