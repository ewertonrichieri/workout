"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TechniqueAnalysisResult } from "@/lib/technique-analysis/analysis-schema";
import { requestTechniqueAnalysis, type AnalysisRequest } from "./technique-analysis-request";

export type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: TechniqueAnalysisResult }
  | { status: "error"; message: string };

interface AnalysisOptions extends AnalysisRequest {
  /** False when the set must be recorded again: the AI is not called (spec 014). */
  isEnabled: boolean;
}

/** Asks the AI once when the summary opens, and again only on "Tentar de novo" (each call counts in the D11 limit). */
export function useTechniqueAnalysis({ reps, exerciseSlug, cameraView, isEnabled }: AnalysisOptions) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ attempt: number; state: AnalysisState } | null>(null);
  const requestedAttemptRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled || requestedAttemptRef.current === attempt) return;
    requestedAttemptRef.current = attempt;
    void requestTechniqueAnalysis({ reps, exerciseSlug, cameraView }).then((response) => {
      const state: AnalysisState = response.ok ? { status: "success", result: response.data } : { status: "error", message: response.message };
      setSettled({ attempt, state });
    });
  }, [attempt, isEnabled, reps, exerciseSlug, cameraView]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  if (!isEnabled) return { state: { status: "idle" } as AnalysisState, retry };
  const state: AnalysisState = settled?.attempt === attempt ? settled.state : { status: "loading" };
  return { state, retry };
}
