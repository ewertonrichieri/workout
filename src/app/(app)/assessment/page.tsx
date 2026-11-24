import { Suspense } from "react";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import { EmptyState } from "@/components/layout/empty-state";
import { HealthNotice } from "@/components/layout/health-notice";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { GeneratePlanSection } from "@/components/plan-generation/generate-plan-section";
import { createServerAssessmentService } from "@/lib/assessment/server-assessment-service";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { translate } from "@/lib/i18n/translate";
import { createServerPlanGenerationService } from "@/lib/plan-generation/server-plan-generation-service";

async function AssessmentContent() {
  const userId = await getAuthenticatedUserId();
  const [assessmentService, generationService] = await Promise.all([createServerAssessmentService(), createServerPlanGenerationService()]);
  const [{ equipment, latest }, status] = await Promise.all([assessmentService.getAssessmentForm(userId), generationService.getGenerationStatus(userId)]);
  if (equipment.length === 0) {
    return <EmptyState title={translate("assessment.noEquipmentTitle")} description={translate("assessment.noEquipmentDescription")} />;
  }
  return (
    <>
      <HealthNotice hasLimitations={status.hasLimitations} />
      <AssessmentForm equipment={equipment} latest={latest} />
      {latest && <GeneratePlanSection hasActivePlan={status.hasActivePlan} />}
    </>
  );
}

/** Anamnese (step 3.1) and plan generation (step 3.3) once an assessment exists. */
export default function AssessmentPage() {
  return (
    <>
      <PageHeader title={translate("pages.assessment.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Suspense fallback={<ListSkeleton label={translate("assessment.loading")} rows={4} />}>
          <AssessmentContent />
        </Suspense>
      </main>
    </>
  );
}
