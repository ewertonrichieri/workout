"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { hasCameraSupport } from "@/lib/technique/camera-support";
import { buildTechniqueHref, findTechniqueRuleSet } from "@/lib/technique/technique-support";
import { translate } from "@/lib/i18n/translate";

const LINK_CLASS =
  "flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

function subscribeToNothing(): () => void {
  return () => undefined;
}

/** True on the server, so the link renders and only devices without a camera swap it for the disabled button. */
function readCameraSupport(): boolean {
  return hasCameraSupport(navigator);
}

/** "Analisar minha execução" in the workout card, only for supported exercises (spec 014, D3). */
export function AnalyzeTechniqueLink({ exerciseSlug }: { exerciseSlug: string }) {
  const isCameraSupported = useSyncExternalStore(subscribeToNothing, readCameraSupport, () => true);
  if (!findTechniqueRuleSet(exerciseSlug)) return null;
  if (!isCameraSupported) {
    return (
      <button type="button" disabled aria-label={translate("technique.analyzeUnavailable")} className={`${LINK_CLASS} opacity-60`}>
        {translate("technique.analyzeLink")}
      </button>
    );
  }
  return <Link href={buildTechniqueHref(exerciseSlug)} className={LINK_CLASS}>{translate("technique.analyzeLink")}</Link>;
}
