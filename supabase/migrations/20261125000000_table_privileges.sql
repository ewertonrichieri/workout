-- Table privileges for the app role (spec 006, bug history 2026-11-25).
-- New Supabase projects no longer grant table privileges to the Data API roles by default, so
-- `authenticated` could not read anything even with RLS policies in place. Least privilege per
-- table; RLS keeps restricting rows to the owner. `anon` gets nothing (every screen needs login).
-- Assessments are granted with step 3.1.

grant select on
  public.muscles,
  public.equipment,
  public.exercises,
  public.exercise_muscles,
  public.exercise_equipment,
  public.exercise_media,
  public.profiles,
  public.plans,
  public.workouts,
  public.workout_exercises
to authenticated;

-- "Salvar carga para progredir" toggle (step 2.7) is the only column the app updates for now.
grant update (track_progression) on public.workout_exercises to authenticated;

-- "Finalizar treino" (step 2.6) and history (step 2.8).
grant select, insert on public.workout_sessions, public.set_logs to authenticated;
