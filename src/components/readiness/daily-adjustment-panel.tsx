"use client";

import { useEffect, useId, useRef, useState } from "react";
import { translate } from "@/lib/i18n/translate";
import type { AdjustmentProposal, DraftAdjustment } from "@/lib/readiness/adjustment-schema";
import type { Workout } from "@/lib/training/plan-types";
import { AdjustmentChangeItem } from "./adjustment-change-item";
import { requestAdjustmentProposal, saveAdjustmentChanges } from "./adjustment-request";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./readiness-styles";

interface DailyAdjustmentPanelProps {
  checkinId: string;
  /** The planned workout (names and prescriptions of "before"). */
  planned: Workout;
  adjustment: DraftAdjustment | null;
  /** "Voltar ao treino original" only while no set is checked. */
  canUndo: boolean;
  onChange: (adjustment: DraftAdjustment) => void;
}

type RequestStep = { name: "loading" } | { name: "error"; message: string };
type SaveStep = { name: "idle" } | { name: "saving" } | { name: "error"; message: string };

const DECLINED: DraftAdjustment = { status: "declined" };
const CARD_CLASS = "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4";

function ButtonRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function LoadingCard() {
  return (
    <section role="status" aria-busy="true" className={CARD_CLASS}>
      <p className="font-semibold">{translate("readiness.adjustment.loading")}</p>
      <p className="text-sm text-muted">{translate("readiness.adjustment.loadingHint")}</p>
    </section>
  );
}

function LoadFailure({ message, onRetry, onTrainNormally }: { message: string; onRetry: () => void; onTrainNormally: () => void }) {
  return (
    <section className={CARD_CLASS}>
      <p role="alert" className="font-medium text-accent-strong">{message}</p>
      <p className="text-sm">{translate("readiness.adjustment.failedFallback")}</p>
      <ButtonRow>
        <button type="button" onClick={onRetry} className={PRIMARY_BUTTON_CLASS}>{translate("readiness.adjustment.retryButton")}</button>
        <button type="button" onClick={onTrainNormally} className={SECONDARY_BUTTON_CLASS}>{translate("readiness.adjustment.trainNormallyButton")}</button>
      </ButtonRow>
    </section>
  );
}

/** Calls the AI once when shown (a ref guards against double effects); failure keeps the normal workout. */
function ProposalLoader({ checkinId, onChange }: Pick<DailyAdjustmentPanelProps, "checkinId" | "onChange">) {
  const [step, setStep] = useState<RequestStep>({ name: "loading" });
  const hasRequested = useRef(false);
  const load = async () => {
    setStep({ name: "loading" });
    const result = await requestAdjustmentProposal(checkinId);
    if (result.ok) onChange({ status: "proposed", proposal: result.data });
    else setStep({ name: "error", message: result.message });
  };
  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;
    void load();
  });
  if (step.name === "loading") return <LoadingCard />;
  return <LoadFailure message={step.message} onRetry={() => void load()} onTrainNormally={() => onChange(DECLINED)} />;
}

function ProposalChanges({ proposal, planned }: { proposal: AdjustmentProposal; planned: Workout }) {
  if (proposal.changes.length === 0) return <p>{translate("readiness.adjustment.noChanges")}</p>;
  return (
    <ul aria-label={translate("readiness.adjustment.changesLabel")} className="flex flex-col gap-2">
      {proposal.changes.map((change) => {
        const prescription = planned.exercises.find((item) => item.id === change.workoutExerciseId);
        return prescription ? <AdjustmentChangeItem key={change.workoutExerciseId} change={change} planned={prescription} /> : null;
      })}
    </ul>
  );
}

/** Review before using (the user decides, never automatic); accepting saves the changes on the server. */
function ProposalReview({ proposal, planned, onChange }: { proposal: AdjustmentProposal; planned: Workout; onChange: DailyAdjustmentPanelProps["onChange"] }) {
  const [step, setStep] = useState<SaveStep>({ name: "idle" });
  const accept = async () => {
    setStep({ name: "saving" });
    const result = await saveAdjustmentChanges(proposal.checkinId, proposal.changes);
    if (result.ok) onChange({ status: "accepted", proposal });
    else setStep({ name: "error", message: result.message });
  };
  const titleId = useId();
  const hasChanges = proposal.changes.length > 0;
  return (
    <section aria-labelledby={titleId} className={CARD_CLASS}>
      <h3 id={titleId} className="text-lg font-semibold">{translate("readiness.adjustment.reviewTitle")}</h3>
      <p className="text-sm text-muted">{translate("readiness.adjustment.reviewHint")}</p>
      <p>{proposal.summary}</p>
      {hasChanges && <p className="text-sm font-medium">{translate("readiness.adjustment.estimatedMinutes", { minutes: proposal.estimatedMinutes })}</p>}
      <ProposalChanges proposal={proposal} planned={planned} />
      {step.name === "error" && <p role="alert" className="font-medium text-accent-strong">{step.message}</p>}
      <ButtonRow>
        {hasChanges && (
          <button type="button" onClick={() => void accept()} disabled={step.name === "saving"} className={PRIMARY_BUTTON_CLASS}>
            {translate(step.name === "saving" ? "readiness.adjustment.saving" : "readiness.adjustment.acceptButton")}
          </button>
        )}
        <button type="button" onClick={() => onChange(DECLINED)} className={SECONDARY_BUTTON_CLASS}>
          {translate(hasChanges ? "readiness.adjustment.declineButton" : "readiness.adjustment.continueButton")}
        </button>
      </ButtonRow>
    </section>
  );
}

/** Accepted: the cards show today's workout; undo restores the plan on the server and here. */
function AcceptedNotice({ proposal, canUndo, onChange }: { proposal: AdjustmentProposal; canUndo: boolean; onChange: DailyAdjustmentPanelProps["onChange"] }) {
  const [step, setStep] = useState<SaveStep>({ name: "idle" });
  const undo = async () => {
    setStep({ name: "saving" });
    const result = await saveAdjustmentChanges(proposal.checkinId, []);
    if (result.ok) onChange(DECLINED);
    else setStep({ name: "error", message: result.message });
  };
  return (
    <section role="status" className={CARD_CLASS}>
      <p className="font-semibold">{translate("readiness.adjustment.acceptedNotice")}</p>
      <p className="text-sm">{proposal.summary}</p>
      {step.name === "error" && <p role="alert" className="font-medium text-accent-strong">{step.message}</p>}
      {canUndo && (
        <ButtonRow>
          <button type="button" onClick={() => void undo()} disabled={step.name === "saving"} className={SECONDARY_BUTTON_CLASS}>
            {translate(step.name === "saving" ? "readiness.adjustment.saving" : "readiness.adjustment.undoButton")}
          </button>
        </ButtonRow>
      )}
    </section>
  );
}

/** Daily adjustment by AI (step 3B.2): load, review, accept or keep, undo. */
export function DailyAdjustmentPanel({ checkinId, planned, adjustment, canUndo, onChange }: DailyAdjustmentPanelProps) {
  if (adjustment === null) return <ProposalLoader checkinId={checkinId} onChange={onChange} />;
  if (adjustment.status === "proposed") return <ProposalReview proposal={adjustment.proposal} planned={planned} onChange={onChange} />;
  if (adjustment.status === "accepted") return <AcceptedNotice proposal={adjustment.proposal} canUndo={canUndo} onChange={onChange} />;
  return <p role="status" className="rounded-2xl border border-border bg-surface p-4 text-sm">{translate("readiness.adjustment.declinedNotice")}</p>;
}
