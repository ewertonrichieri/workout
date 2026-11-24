import { Suspense } from "react";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import { EmptyState } from "@/components/layout/empty-state";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { createServerAssessmentService } from "@/lib/assessment/server-assessment-service";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { translate } from "@/lib/i18n/translate";

async function AssessmentContent() {
  const userId = await getAuthenticatedUserId();
  const service = await createServerAssessmentService();
  const { equipment, latest } = await service.getAssessmentForm(userId);
  if (equipment.length === 0) {
    return <EmptyState title={translate("assessment.noEquipmentTitle")} description={translate("assessment.noEquipmentDescription")} />;
  }
  return <AssessmentForm equipment={equipment} latest={latest} />;
}

/** Anamnese (step 3.1): filled with the latest assessment when there is one. */
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
