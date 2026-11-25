-- SUB-001 (2026-11-25; spec 012): the AI's swap choices are kept per user and per exact AI input
-- (sha256 of the system prompt + prompt), so asking the same swap again never pays the AI twice.
-- Per user, not shared: the reasons may mention the user's limitations, and a shared table
-- would let one user write what others see.

create table public.substitution_caches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (user_id, cache_key)
);

create table public.substitution_cache_choices (
  cache_id uuid not null references public.substitution_caches (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  primary key (cache_id, position),
  unique (cache_id, exercise_id)
);
create index substitution_cache_choices_exercise_id_idx on public.substitution_cache_choices (exercise_id);

alter table public.substitution_caches enable row level security;
alter table public.substitution_cache_choices enable row level security;

create policy "substitution_caches_owner" on public.substitution_caches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "substitution_cache_choices_owner" on public.substitution_cache_choices
  for all to authenticated
  using (exists (
    select 1 from public.substitution_caches c
    where c.id = cache_id and c.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.substitution_caches c
    where c.id = cache_id and c.user_id = (select auth.uid())));

grant select, insert on public.substitution_caches, public.substitution_cache_choices to authenticated;

-- The caller's saved choices for the key, best first (empty when none). Caller's rights (RLS).
create or replace function public.find_substitution_cache(p_cache_key text)
returns table (exercise_slug text, reason text)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.slug, ch.reason
  from public.substitution_caches c
  join public.substitution_cache_choices ch on ch.cache_id = c.id
  join public.exercises e on e.id = ch.exercise_id
  where c.user_id = (select auth.uid()) and c.cache_key = p_cache_key
  order by ch.position;
$$;

revoke all on function public.find_substitution_cache(text) from public, anon;
grant execute on function public.find_substitution_cache(text) to authenticated;

-- Saves the choices in one transaction. Caller's rights (RLS). Exercises need media.
-- A key keeps its first save: a second one (concurrent request) changes nothing and returns false.
create or replace function public.save_substitution_cache(p_cache_key text, p_choices jsonb)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_cache_id uuid;
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'save_substitution_cache: not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_choices) is distinct from 'array' or jsonb_array_length(p_choices) not between 1 and 3 then
    raise exception 'save_substitution_cache: choices must be an array of 1 to 3' using errcode = '22023';
  end if;

  insert into public.substitution_caches (user_id, cache_key) values (v_user_id, p_cache_key)
  on conflict (user_id, cache_key) do nothing
  returning id into v_cache_id;
  if v_cache_id is null then
    return false;
  end if;

  insert into public.substitution_cache_choices (cache_id, position, exercise_id, reason)
  select v_cache_id, x.position, e.id, x.reason
  from rows from (jsonb_to_recordset(p_choices) as (exercise_slug text, reason text))
    with ordinality as x (exercise_slug, reason, position)
  join public.exercises e on e.slug = x.exercise_slug
    and exists (select 1 from public.exercise_media md where md.exercise_id = e.id and md.is_enabled);

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_choices) then
    raise exception 'save_substitution_cache: unknown exercise' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.save_substitution_cache(text, jsonb) from public, anon;
grant execute on function public.save_substitution_cache(text, jsonb) to authenticated;
