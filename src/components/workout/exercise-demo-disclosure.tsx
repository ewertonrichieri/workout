"use client";

import { useState, type SyntheticEvent } from "react";
import { ExerciseMediaPlayer } from "@/components/exercises/exercise-media-player";
import type { PlannedExerciseInfo } from "@/lib/training/plan-types";
import { translate } from "@/lib/i18n/translate";

/** "Ver demonstração" inside the workout card; media is mounted only once opened (saves data). */
export function ExerciseDemoDisclosure({ exercise }: { exercise: PlannedExerciseInfo }) {
  const [hasOpened, setHasOpened] = useState(false);
  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) setHasOpened(true);
  };
  return (
    <details onToggle={handleToggle} className="flex flex-col gap-3">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
        {translate("training.showDemo")}
      </summary>
      {hasOpened && <ExerciseMediaPlayer media={exercise.media} exerciseName={exercise.name} />}
    </details>
  );
}
