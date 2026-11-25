"use client";

import { useEffect, useState } from "react";
import { createLogger } from "@/lib/logger/logger";
import { loadPoseDetector, type PoseDetector } from "./pose-detector";

const logger = createLogger({ minimumLevel: "warn" });

type LoadResult = { status: "ready"; detector: PoseDetector } | { status: "error" };
export type PoseDetectorState = { status: "idle" } | { status: "loading" } | LoadResult;

/** Loads the pose model once the camera screen opens and frees it when the screen closes. */
export function usePoseDetector(isActive: boolean, load: () => Promise<PoseDetector> = loadPoseDetector): PoseDetectorState {
  const [result, setResult] = useState<LoadResult | null>(null);
  const shouldLoad = isActive && result === null;

  useEffect(() => {
    if (!shouldLoad) return;
    let isCancelled = false;
    load()
      .then((detector) => {
        if (isCancelled) detector.close();
        else setResult({ status: "ready", detector });
      })
      .catch((error: unknown) => {
        logger.warn("pose model load failed", { operation: "technique.pose_load", error: error instanceof Error ? error.name : "unknown" });
        if (!isCancelled) setResult({ status: "error" });
      });
    return () => {
      isCancelled = true;
    };
  }, [shouldLoad, load]);

  useEffect(() => () => {
    if (result?.status === "ready") result.detector.close();
  }, [result]);

  if (result) return result;
  return isActive ? { status: "loading" } : { status: "idle" };
}
