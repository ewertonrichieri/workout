-- AI cost control (2026-11-24; specs 011 and 012).
-- 1) Per-user limit of the AI calls that cost money (ai_requests + register_ai_request).
-- 2) The daily adjustment proposal is kept per check-in, so asking again never pays the AI twice.

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  operation text not null check (operation in ('plan.generate', 'readiness.adjust')),
  created_at timestamptz not null default now()
);
create index ai_requests_user_operation_created_idx on public.ai_requests (user_id, operation, created_at desc);

alter table public.ai_requests enable row level security;

create policy "ai_requests_owner" on public.ai_requests
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No update or delete: users cannot reset their own counter.
grant select, insert on public.ai_requests to authenticated;

-- Counts the caller's requests of the operation in the window and registers one more when under the limit.
-- The advisory lock serializes concurrent requests of the same user and operation (no double spending).
-- Caller's rights (RLS). Returns false when the limit is reached (nothing is registered).
create or replace function public.register_ai_request(p_operation text, p_max_requests integer, p_window_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'register_ai_request: not authenticated' using errcode = '42501';
  end if;
  if p_max_requests is null or p_max_requests < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'register_ai_request: invalid limit' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_operation, 0));

  select count(*) into v_count
  from public.ai_requests r
  where r.user_id = v_user_id
    and r.operation = p_operation
    and r.created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into public.ai_requests (user_id, operation) values (v_user_id, p_operation);
  return true;
end;
$$;

revoke all on function public.register_ai_request(text, integer, integer) from public, anon;
grant execute on function public.register_ai_request(text, integer, integer) to authenticated;

-- The AI's proposal for a check-in (already validated by the server), before the user decides.
create table public.adjustment_proposals (
  checkin_id uuid primary key references public.readiness_checkins (id) on delete cascade,
  summary text not null check (char_length(summary) between 1 and 300),
  estimated_minutes integer not null check (estimated_minutes between 1 and 240),
  created_at timestamptz not null default now()
);

-- Same shape and rules as session_adjustments (what the user accepts).
create table public.adjustment_proposal_changes (
  checkin_id uuid not null references public.adjustment_proposals (checkin_id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  change_type text not null check (change_type in ('reduced', 'removed', 'replaced')),
  replacement_exercise_id uuid references public.exercises (id) on delete restrict,
  sets integer check (sets > 0),
  reps_min integer check (reps_min > 0),
  reps_max integer,
  reason text not null check (char_length(reason) between 1 and 300),
  primary key (checkin_id, workout_exercise_id),
  check ((change_type = 'replaced') = (replacement_exercise_id is not null)),
  check (
    (change_type = 'removed' and sets is null and reps_min is null and reps_max is null)
    or (change_type <> 'removed' and sets is not null and reps_min is not null and reps_max >= reps_min))
);
create index adjustment_proposal_changes_workout_exercise_id_idx on public.adjustment_proposal_changes (workout_exercise_id);

alter table public.adjustment_proposals enable row level security;
alter table public.adjustment_proposal_changes enable row level security;

create policy "adjustment_proposals_owner" on public.adjustment_proposals
  for all to authenticated
  using (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())));

create policy "adjustment_proposal_changes_owner" on public.adjustment_proposal_changes
  for all to authenticated
  using (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.readiness_checkins c
    where c.id = checkin_id and c.user_id = (select auth.uid())));

grant select, insert on public.adjustment_proposals, public.adjustment_proposal_changes to authenticated;

-- Saves the proposal and its changes in one transaction. Caller's rights (RLS).
-- Prescriptions must belong to the check-in's workout; replacements need media.
-- A check-in keeps its first proposal: a second save (concurrent request) changes nothing and returns false.
create or replace function public.save_adjustment_proposal(
  p_checkin_id uuid,
  p_summary text,
  p_estimated_minutes integer,
  p_changes jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workout_id uuid;
  v_inserted integer;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'save_adjustment_proposal: changes must be an array' using errcode = '22023';
  end if;
  select c.workout_id into v_workout_id from public.readiness_checkins c where c.id = p_checkin_id;
  if v_workout_id is null then
    raise exception 'save_adjustment_proposal: check-in not found' using errcode = '22023';
  end if;

  insert into public.adjustment_proposals (checkin_id, summary, estimated_minutes)
  values (p_checkin_id, p_summary, p_estimated_minutes)
  on conflict (checkin_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.adjustment_proposal_changes
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
    raise exception 'save_adjustment_proposal: changes do not match the workout' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.save_adjustment_proposal(uuid, text, integer, jsonb) from public, anon;
grant execute on function public.save_adjustment_proposal(uuid, text, integer, jsonb) to authenticated;
