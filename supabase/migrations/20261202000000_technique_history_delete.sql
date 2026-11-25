-- Spec 014 (step 5.5, decision D9): the user can delete an analysis from the technique history.
-- RLS policies ("for all", owner only) already cover delete; the cascade removes reps, issues and feedback.
grant delete on public.technique_analyses, public.technique_reps, public.technique_rep_issues, public.technique_analysis_feedback to authenticated;
