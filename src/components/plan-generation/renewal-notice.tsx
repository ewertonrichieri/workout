import Link from "next/link";
import { formatCalendarDate } from "@/components/workout/workout-labels";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";
import type { RenewalInfo } from "@/lib/plan-generation/plan-generation-service";
import { GeneratePlanButton } from "./generate-plan-button";

const LINK_CLASS =
  "flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

function describeDeadline({ validUntil, remainingDays, isExpired }: RenewalInfo): string {
  if (isExpired) return translate("planGeneration.renewExpired", { date: formatCalendarDate(validUntil) });
  if (remainingDays === 0) return translate("planGeneration.renewLastDay");
  if (remainingDays === 1) return translate("planGeneration.renewDaysOne");
  return translate("planGeneration.renewDaysOther", { count: remainingDays });
}

/** Renewal suggestion (step 3.6): last days of validity or expired; the user decides. */
export function RenewalNotice({ renewal }: { renewal: RenewalInfo }) {
  return (
    <section aria-labelledby="renewal-title" className="flex flex-col gap-3 rounded-2xl border border-accent-strong bg-surface p-4">
      <h2 id="renewal-title" className="text-lg font-semibold">{translate("planGeneration.renewTitle")}</h2>
      <p>{describeDeadline(renewal)}</p>
      <p className="text-muted">{translate("planGeneration.renewDescription")}</p>
      <GeneratePlanButton hasActivePlan labelKey="planGeneration.renewButton" />
      <Link href={APP_ROUTES.assessment} className={LINK_CLASS}>{translate("planGeneration.renewAssessmentLink")}</Link>
    </section>
  );
}
