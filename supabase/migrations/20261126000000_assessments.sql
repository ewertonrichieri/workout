-- Assessment / anamnese (spec 011, step 3.1).
-- Adds the split preference and saves an assessment with its equipment in one transaction.

alter table public.assessments
  add column split_preference text not null default 'ai_decides'
    check (split_preference in ('ai_decides', 'full_body', 'split'));

alter table public.assessments
  add constraint assessments_limitations_length check (char_length(limitations) <= 1000);

create index assessments_user_id_created_at_idx on public.assessments (user_id, created_at desc);

-- Runs with the caller's rights, so RLS on assessments and assessment_equipment applies.
-- The owner is always auth.uid(); unknown equipment slugs abort the whole transaction.
create or replace function public.save_assessment(
  p_goal text,
  p_experience_level text,
  p_days_per_week integer,
  p_session_minutes integer,
  p_split_preference text,
  p_limitations text,
  p_equipment_slugs text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assessment_id uuid;
  v_inserted integer;
  v_requested integer := coalesce(cardinality(array(select distinct unnest(p_equipment_slugs))), 0);
begin
  if v_requested = 0 then
    raise exception 'save_assessment: at least one equipment is required' using errcode = '22023';
  end if;

  insert into public.assessments
    (user_id, goal, experience_level, days_per_week, session_minutes, split_preference, limitations)
  values
    ((select auth.uid()), p_goal, p_experience_level, p_days_per_week, p_session_minutes, p_split_preference, p_limitations)
  returning id into v_assessment_id;

  insert into public.assessment_equipment (assessment_id, equipment_id)
  select v_assessment_id, e.id
  from public.equipment e
  where e.slug = any (p_equipment_slugs);

  get diagnostics v_inserted = row_count;
  if v_inserted <> v_requested then
    raise exception 'save_assessment: unknown equipment' using errcode = '22023';
  end if;

  return v_assessment_id;
end;
$$;

revoke all on function public.save_assessment(text, text, integer, integer, text, text, text[]) from public, anon;
grant execute on function public.save_assessment(text, text, integer, integer, text, text, text[]) to authenticated;

grant select, insert on public.assessments, public.assessment_equipment to authenticated;
