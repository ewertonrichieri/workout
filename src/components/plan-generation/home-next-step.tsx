import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";
import type { GenerationStatus } from "@/lib/plan-generation/plan-generation-service";
import { GeneratePlanButton } from "./generate-plan-button";

const LINK_CLASS =
  "flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";
const PRIMARY_LINK_CLASS = `${LINK_CLASS} bg-accent text-accent-foreground`;
const SECONDARY_LINK_CLASS = `${LINK_CLASS} border border-border font-medium`;

/** Next step for the user: answer the assessment, generate the plan, or open the workout. */
export function HomeNextStep({ status }: { status: GenerationStatus }) {
  if (status.hasActivePlan) {
    return (
      <EmptyState title={translate("pages.home.planReadyTitle")} description={translate("pages.home.planReadyDescription")}>
        <Link href={APP_ROUTES.workout} className={`${PRIMARY_LINK_CLASS} mt-2`}>{translate("planGeneration.viewWorkoutLink")}</Link>
      </EmptyState>
    );
  }
  if (!status.hasAssessment) {
    return (
      <EmptyState title={translate("pages.home.emptyTitle")} description={translate("pages.home.emptyDescription")}>
        <Link href={APP_ROUTES.assessment} className={`${PRIMARY_LINK_CLASS} mt-2`}>{translate("assessment.startLink")}</Link>
      </EmptyState>
    );
  }
  return (
    <>
      <EmptyState title={translate("pages.home.emptyTitle")} description={translate("pages.home.assessmentReadyDescription")} />
      <GeneratePlanButton hasActivePlan={false} />
      <Link href={APP_ROUTES.assessment} className={SECONDARY_LINK_CLASS}>{translate("assessment.editLink")}</Link>
    </>
  );
}
