"use client";

import { useReducer } from "react";
import type { TechniqueRuleSet } from "@/lib/constants/technique";
import { INITIAL_TECHNIQUE_FLOW, reduceTechniqueFlow } from "@/lib/technique/technique-flow";
import { CameraErrorPanel } from "./camera-error-panel";
import { PositioningGuide } from "./positioning-guide";
import { TechniqueCamera } from "./technique-camera";
import { TechniqueNotice } from "./technique-notice";
import { TechniqueSummaryView } from "./technique-summary-view";

/** "Analisar minha execução": notice → positioning guide → camera (framing, countdown, recording) → summary. */
export function TechniqueScreen({ exerciseSlug, ruleSet }: { exerciseSlug: string; ruleSet: TechniqueRuleSet }) {
  const [flow, dispatch] = useReducer(reduceTechniqueFlow, INITIAL_TECHNIQUE_FLOW);
  const backToGuide = () => dispatch({ type: "back_to_guide" });
  switch (flow.phase) {
    case "notice":
      return <TechniqueNotice onAccept={() => dispatch({ type: "accept_notice" })} />;
    case "guide":
      return <PositioningGuide ruleSetId={ruleSet.id} onOpenCamera={() => dispatch({ type: "open_camera" })} />;
    case "camera_error":
      return <CameraErrorPanel reason={flow.reason} onRetry={backToGuide} />;
    case "model_error":
      return <CameraErrorPanel reason="model" onRetry={backToGuide} />;
    case "summary":
      return (
        <TechniqueSummaryView
          reps={flow.reps}
          replay={flow.replay}
          exerciseSlug={exerciseSlug}
          ruleSet={ruleSet}
          onRecordAgain={() => dispatch({ type: "record_again" })}
        />
      );
    default:
      return <TechniqueCamera phase={flow.phase} ruleSet={ruleSet} dispatch={dispatch} />;
  }
}
