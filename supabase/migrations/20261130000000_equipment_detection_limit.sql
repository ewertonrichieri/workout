-- Spec 013 (step 4.1, decision D6): the equipment detection from photos counts in the per-user AI limit.
-- No new table: the photos are never saved, and the confirmed list is saved with the assessment.

alter table public.ai_requests
  drop constraint ai_requests_operation_check,
  add constraint ai_requests_operation_check
    check (operation in ('plan.generate', 'readiness.adjust', 'equipment.detect'));
