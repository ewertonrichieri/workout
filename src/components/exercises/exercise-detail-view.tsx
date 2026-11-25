import Link from "next/link";
import { buildProgressHref } from "@/components/history/history-labels";
import type { CatalogTerm, ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { translate, type TranslationKey } from "@/lib/i18n/translate";
import { describeDifficulty } from "./exercise-labels";
import { TechniqueHistory } from "@/components/technique/technique-history";
import { findTechniqueRuleSet } from "@/lib/technique/technique-support";
import { ExerciseMediaPlayer } from "./exercise-media-player";

function TermSection({ titleKey, terms }: { titleKey: TranslationKey; terms: CatalogTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{translate(titleKey)}</h3>
      <ul className="flex flex-wrap gap-2">
        {terms.map((term) => <li key={term.slug} className="rounded-full border border-border px-3 py-1 text-sm">{term.name}</li>)}
      </ul>
    </section>
  );
}

export function ExerciseDetailView({ exercise }: { exercise: ExerciseDetail }) {
  const showEnglishName = exercise.nameEn !== null && exercise.nameEn !== exercise.name;
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{exercise.name}</h2>
        {showEnglishName && <p lang="en" className="text-muted">{exercise.nameEn}</p>}
        {exercise.difficulty && <p className="text-sm text-accent-strong">{describeDifficulty(exercise.difficulty)}</p>}
      </header>
      <ExerciseMediaPlayer key={exercise.slug} media={exercise.media} exerciseName={exercise.name} />
      <Link href={buildProgressHref(exercise.slug)} className="flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
        {translate("history.progressLink")}
      </Link>
      {findTechniqueRuleSet(exercise.slug) && <TechniqueHistory exerciseSlug={exercise.slug} />}
      <TermSection titleKey="catalog.primaryMuscles" terms={exercise.primaryMuscles} />
      <TermSection titleKey="catalog.secondaryMuscles" terms={exercise.secondaryMuscles} />
      <TermSection titleKey="catalog.equipment" terms={exercise.equipment} />
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">{translate("catalog.instructions")}</h3>
        <p className={exercise.instructions ? "whitespace-pre-line" : "text-muted"}>
          {exercise.instructions ?? translate("catalog.instructionsPending")}
        </p>
      </section>
    </article>
  );
}
