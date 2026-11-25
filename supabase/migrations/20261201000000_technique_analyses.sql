-- Posture correction (spec 014, step 5.4): AI analyses of a set measured on the phone.
-- Decision D9: only analyses the AI completed are saved. Decision D6: no video, image or landmark is ever stored,
-- only the numbers of each rep, the issues found by the server rules and the AI texts.

create table public.technique_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  camera_view text not null check (camera_view in ('side', 'front')),
  rep_count integer not null check (rep_count between 1 and 40),
  evaluated_rep_count integer not null check (evaluated_rep_count between 0 and rep_count),
  overall_score smallint not null check (overall_score between 0 and 10),
  main_tip text not null check (char_length(main_tip) <= 240),
  created_at timestamptz not null default now()
);
create index technique_analyses_user_exercise_created_idx on public.technique_analyses (user_id, exercise_id, created_at desc);
create index technique_analyses_exercise_id_idx on public.technique_analyses (exercise_id);

create table public.technique_reps (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.technique_analyses (id) on delete cascade,
  rep_number integer not null check (rep_number between 1 and 40),
  score smallint check (score between 0 and 10),
  is_evaluated boolean not null,
  duration_ms integer not null check (duration_ms between 0 and 60000),
  descent_ms integer not null check (descent_ms between 0 and duration_ms),
  min_knee_angle numeric(4, 1) not null check (min_knee_angle between 0 and 180),
  min_thigh_angle numeric(4, 1) not null check (min_thigh_angle between -90 and 90),
  max_trunk_lean numeric(4, 1) not null check (max_trunk_lean between 0 and 180),
  max_knee_travel_ratio numeric(6, 3) not null check (max_knee_travel_ratio between -10 and 10),
  max_heel_rise_ratio numeric(6, 3) not null check (max_heel_rise_ratio between -10 and 10),
  -- A rep that was not evaluated has no score.
  check (is_evaluated or score is null),
  unique (analysis_id, rep_number)
);

create table public.technique_rep_issues (
  rep_id uuid not null references public.technique_reps (id) on delete cascade,
  issue text not null check (issue in ('shallow_depth', 'heel_lift', 'fast_descent', 'trunk_lean', 'trunk_lean_fatigue', 'knee_forward')),
  severity text not null check (severity in ('error', 'warning', 'info')),
  primary key (rep_id, issue)
);

create table public.technique_analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.technique_analyses (id) on delete cascade,
  kind text not null check (kind in ('strength', 'correction')),
  position smallint not null check (position between 1 and 4),
  issue text check (issue in ('shallow_depth', 'heel_lift', 'fast_descent', 'trunk_lean', 'trunk_lean_fatigue', 'knee_forward')),
  text text not null check (char_length(text) between 1 and 240),
  -- Corrections name their issue; strengths do not.
  check ((kind = 'correction') = (issue is not null)),
  unique (analysis_id, kind, position)
);

alter table public.technique_analyses enable row level security;
alter table public.technique_reps enable row level security;
alter table public.technique_rep_issues enable row level security;
alter table public.technique_analysis_feedback enable row level security;

create policy "technique_analyses_owner" on public.technique_analyses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "technique_reps_owner" on public.technique_reps
  for all to authenticated
  using (exists (select 1 from public.technique_analyses a where a.id = analysis_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.technique_analyses a where a.id = analysis_id and a.user_id = (select auth.uid())));

create policy "technique_rep_issues_owner" on public.technique_rep_issues
  for all to authenticated
  using (exists (
    select 1 from public.technique_reps r join public.technique_analyses a on a.id = r.analysis_id
    where r.id = rep_id and a.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.technique_reps r join public.technique_analyses a on a.id = r.analysis_id
    where r.id = rep_id and a.user_id = (select auth.uid())));

create policy "technique_analysis_feedback_owner" on public.technique_analysis_feedback
  for all to authenticated
  using (exists (select 1 from public.technique_analyses a where a.id = analysis_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.technique_analyses a where a.id = analysis_id and a.user_id = (select auth.uid())));

grant select, insert on public.technique_analyses, public.technique_reps, public.technique_rep_issues, public.technique_analysis_feedback to authenticated;

-- Decision D11: the analysis counts in the per-user AI limit.
alter table public.ai_requests
  drop constraint ai_requests_operation_check,
  add constraint ai_requests_operation_check
    check (operation in ('plan.generate', 'readiness.adjust', 'equipment.detect', 'technique.analyze'));

-- Saves an analysis with its reps, issues and feedback in one transaction, with the caller's rights (RLS applies).
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

  insert into public.technique_reps (
    analysis_id, rep_number, score, is_evaluated, duration_ms, descent_ms, min_knee_angle, min_thigh_angle,
    max_trunk_lean, max_knee_travel_ratio, max_heel_rise_ratio)
  select v_analysis_id, r.rep_number, r.score, r.is_evaluated, r.duration_ms, r.descent_ms, r.min_knee_angle, r.min_thigh_angle,
    r.max_trunk_lean, r.max_knee_travel_ratio, r.max_heel_rise_ratio
  from jsonb_to_recordset(p_reps) as r (
    rep_number integer, score integer, is_evaluated boolean, duration_ms integer, descent_ms integer, min_knee_angle numeric,
    min_thigh_angle numeric, max_trunk_lean numeric, max_knee_travel_ratio numeric, max_heel_rise_ratio numeric);

  -- Separate statement: the RLS check of the issues must see the reps inserted above.
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

revoke all on function public.save_technique_analysis(uuid, text, integer, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_technique_analysis(uuid, text, integer, text, jsonb, jsonb) to authenticated;
