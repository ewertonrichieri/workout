"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { sendJsonRequest } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";

interface TrackProgressionSwitchProps {
  workoutExerciseId: string;
  exerciseName: string;
  isTracked: boolean;
}

const WORKOUT_EXERCISES_ENDPOINT = "/api/workout-exercises";

/** "Salvar carga para progredir": optimistic toggle, reverted with a message when saving fails. */
export function TrackProgressionSwitch({ workoutExerciseId, exerciseName, isTracked }: TrackProgressionSwitchProps) {
  const router = useRouter();
  const errorId = useId();
  const [isOn, setIsOn] = useState(isTracked);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toggle = async () => {
    const next = !isOn;
    setIsOn(next);
    setIsPending(true);
    setErrorMessage(null);
    const url = `${WORKOUT_EXERCISES_ENDPOINT}/${workoutExerciseId}`;
    const result = await sendJsonRequest(url, "PATCH", { trackProgression: next }, translate("training.progression.failed"));
    setIsPending(false);
    if (result.ok) router.refresh();
    else {
      setIsOn(!next);
      setErrorMessage(result.message);
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={translate("training.progression.switchLabel", { name: exerciseName })}
        aria-describedby={errorMessage ? errorId : undefined}
        disabled={isPending}
        onClick={() => void toggle()}
        className="flex min-h-11 items-center gap-3 self-start text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong disabled:opacity-60"
      >
        <span aria-hidden="true" className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${isOn ? "justify-end bg-accent-strong" : "justify-start bg-border"}`}>
          <span className="size-5 rounded-full bg-foreground" />
        </span>
        {translate("training.progression.switchText")}
      </button>
      {errorMessage && <p id={errorId} role="alert" className="text-sm text-accent-strong">{errorMessage}</p>}
    </div>
  );
}
