-- Catalog search used by the exercises API (spec 009, step 1.6).
create extension if not exists unaccent with schema extensions;

-- Accent- and case-insensitive name search, muscle and equipment filters, only exercises with
-- enabled media, paginated. Runs with the caller's rights, so catalog RLS still applies.
create or replace function public.search_exercises(
  search_text text default null,
  muscle_slug text default null,
  equipment_slug text default null,
  page_limit integer default 20,
  page_offset integer default 0
)
returns table (id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.id, count(*) over () as total_count
  from public.exercises e
  where (
      search_text is null
      or extensions.unaccent(lower(e.name_pt || ' ' || coalesce(e.name_en, '')))
        like '%' || extensions.unaccent(lower(
          replace(replace(replace(search_text, '\', '\\'), '%', '\%'), '_', '\_')
        )) || '%'
    )
    and (
      muscle_slug is null
      or exists (
        select 1 from public.exercise_muscles em
        join public.muscles m on m.id = em.muscle_id
        where em.exercise_id = e.id and m.slug = muscle_slug
      )
    )
    and (
      equipment_slug is null
      or exists (
        select 1 from public.exercise_equipment ee
        join public.equipment q on q.id = ee.equipment_id
        where ee.exercise_id = e.id and q.slug = equipment_slug
      )
    )
    and exists (select 1 from public.exercise_media md where md.exercise_id = e.id and md.is_enabled)
  order by e.name_pt, e.slug
  limit page_limit offset page_offset;
$$;

revoke execute on function public.search_exercises(text, text, text, integer, integer) from public, anon;
grant execute on function public.search_exercises(text, text, text, integer, integer) to authenticated;
