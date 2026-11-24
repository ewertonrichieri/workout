import { translate } from "@/lib/i18n/translate";
import { GeneratePlanButton } from "./generate-plan-button";

/** Shown once an assessment exists: explains the generation and offers the button. */
export function GeneratePlanSection({ hasActivePlan }: { hasActivePlan: boolean }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6" aria-labelledby="generate-plan-title">
      <h2 id="generate-plan-title" className="text-lg font-semibold">{translate("planGeneration.generateButton")}</h2>
      <p className="text-muted">{translate("planGeneration.intro")}</p>
      <GeneratePlanButton hasActivePlan={hasActivePlan} />
    </section>
  );
}
