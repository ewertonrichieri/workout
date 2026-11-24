"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_ROUTES, REVIEW_QUERY_PARAM, REVIEW_QUERY_VALUE } from "@/lib/constants/routes";
import { sendJsonRequest } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";

export const PLANS_ENDPOINT = "/api/plans";

type GenerateStep = { name: "idle" } | { name: "confirming" } | { name: "generating" } | { name: "error"; message: string };

const BUTTON_CLASS =
  "min-h-11 rounded-lg px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong disabled:opacity-60";
const PRIMARY_CLASS = `${BUTTON_CLASS} bg-accent text-accent-foreground`;
const SECONDARY_CLASS = `${BUTTON_CLASS} border border-border`;

function ConfirmReplace({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <p>{translate("planGeneration.confirmReplace")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onConfirm} className={PRIMARY_CLASS}>{translate("planGeneration.confirmButton")}</button>
        <button type="button" onClick={onCancel} className={SECONDARY_CLASS}>{translate("planGeneration.cancelButton")}</button>
      </div>
    </div>
  );
}

/** Generation can take up to 2 minutes: the request stays open and the screen says so. */
function useGeneratePlan() {
  const router = useRouter();
  const [step, setStep] = useState<GenerateStep>({ name: "idle" });
  const generate = async (replaceActivePlan: boolean) => {
    setStep({ name: "generating" });
    const result = await sendJsonRequest(PLANS_ENDPOINT, "POST", { replaceActivePlan }, translate("planGeneration.failed"));
    if (result.ok) router.push(`${APP_ROUTES.workout}?${new URLSearchParams({ [REVIEW_QUERY_PARAM]: REVIEW_QUERY_VALUE })}`);
    else setStep({ name: "error", message: result.message });
  };
  return { step, setStep, generate };
}

/** "Gerar plano com IA": asks before replacing an active plan (the old one is archived). */
export function GeneratePlanButton({ hasActivePlan }: { hasActivePlan: boolean }) {
  const { step, setStep, generate } = useGeneratePlan();
  if (step.name === "confirming") {
    return <ConfirmReplace onConfirm={() => void generate(true)} onCancel={() => setStep({ name: "idle" })} />;
  }
  const isGenerating = step.name === "generating";
  const start = () => (hasActivePlan ? setStep({ name: "confirming" }) : void generate(false));
  return (
    <div className="flex flex-col gap-2">
      {isGenerating && <p role="status" className="text-muted">{translate("planGeneration.generatingHint")}</p>}
      {step.name === "error" && <p role="alert" className="font-medium text-accent-strong">{step.message}</p>}
      <button type="button" onClick={start} disabled={isGenerating} aria-busy={isGenerating} className={PRIMARY_CLASS}>
        {translate(isGenerating ? "planGeneration.generating" : "planGeneration.generateButton")}
      </button>
    </div>
  );
}
