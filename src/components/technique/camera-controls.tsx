import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { translate } from "@/lib/i18n/translate";

export type CameraPhase = "framing" | "countdown" | "recording";

interface CameraControlsProps {
  phase: CameraPhase;
  canStart: boolean;
  onStart: () => void;
  onCancelCountdown: () => void;
  onStop: () => void;
}

/** "Começar" (only with the body framed), "Cancelar" during the countdown and "Encerrar" while recording. */
export function CameraControls({ phase, canStart, onStart, onCancelCountdown, onStop }: CameraControlsProps) {
  if (phase === "countdown") {
    return <button type="button" onClick={onCancelCountdown} className={SECONDARY_BUTTON_CLASS}>{translate("technique.countdown.cancel")}</button>;
  }
  if (phase === "recording") {
    return (
      <>
        <p className="text-sm text-muted">{translate("technique.recording.nextStepsNotice")}</p>
        <button type="button" onClick={onStop} className={PRIMARY_BUTTON_CLASS}>{translate("technique.recording.stop")}</button>
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={onStart} disabled={!canStart} aria-describedby="technique-start-hint" className={PRIMARY_BUTTON_CLASS}>
        {translate("technique.framing.start")}
      </button>
      {!canStart && <p id="technique-start-hint" className="text-sm text-muted">{translate("technique.framing.startDisabledHint")}</p>}
    </>
  );
}
