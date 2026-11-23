-- Origin identifier of each imported exercise, so re-imports never duplicate (spec 009).
create table public.exercise_source_refs (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  source text not null,
  external_id text not null,
  primary key (source, external_id)
);
create index exercise_source_refs_exercise_id_idx on public.exercise_source_refs (exercise_id);

alter table public.exercise_source_refs enable row level security;

create policy "exercise_source_refs_read" on public.exercise_source_refs for select to authenticated using (true);
