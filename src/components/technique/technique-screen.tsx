"use client";

import { useReducer } from "react";
import type { TechniqueRuleSet } from "@/lib/constants/technique";
import { INITIAL_TECHNIQUE_FLOW, reduceTechniqueFlow } from "@/lib/technique/technique-flow";
import { CameraErrorPanel } from "./camera-error-panel";
import { PositioningGuide } from "./positioning-guide";
import { TechniqueCamera } from "./technique-camera";
import { TechniqueNotice } from "./technique-notice";

/** "Analisar minha execução": notice → positioning guide → camera with skeleton and framing check. */
export function TechniqueScreen({ ruleSet }: { ruleSet: TechniqueRuleSet }) {
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
    default:
      return <TechniqueCamera phase={flow.phase} dispatch={dispatch} />;
  }
}
