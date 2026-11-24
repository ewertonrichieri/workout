import Link from "next/link";
import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { buildWorkoutHref } from "./workout-labels";

interface WorkoutTabsProps {
  workouts: readonly Workout[];
  selectedLabel: string;
}

const TAB_BASE_CLASS =
  "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-lg px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** Workout switcher (A, B, C...) as links: works without client JavaScript and keeps the choice in the URL. */
export function WorkoutTabs({ workouts, selectedLabel }: WorkoutTabsProps) {
  return (
    <nav aria-label={translate("training.tabsLabel")} className="flex gap-2 rounded-xl border border-border bg-surface p-1">
      {workouts.map((workout) => {
        const isSelected = workout.label === selectedLabel;
        return (
          <Link
            key={workout.id}
            href={buildWorkoutHref(workout.label)}
            aria-label={translate("training.tabLabel", { label: workout.label })}
            aria-current={isSelected ? "page" : undefined}
            className={`${TAB_BASE_CLASS} ${isSelected ? "bg-accent text-accent-foreground" : "text-muted"}`}
          >
            {workout.label}
          </Link>
        );
      })}
    </nav>
  );
}
