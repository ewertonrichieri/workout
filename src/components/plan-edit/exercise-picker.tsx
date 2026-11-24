"use client";

import { useState, type FormEvent } from "react";
import { translate } from "@/lib/i18n/translate";
import type { DraftExerciseInfo } from "@/lib/training/workout-edit-draft";
import { searchCatalogExercises } from "./exercise-search-request";
import { EDIT_BUTTON_CLASS, EDIT_INPUT_CLASS } from "./plan-edit-styles";

type SearchState = { name: "idle" } | { name: "loading" } | { name: "done"; items: DraftExerciseInfo[] } | { name: "error" };

interface ExercisePickerProps {
  title: string;
  /** Exercises already in the workout (never offered again). */
  excludedSlugs: ReadonlySet<string>;
  onChoose: (exercise: DraftExerciseInfo) => void;
  onCancel: () => void;
}

function SearchResults({ title, state, onChoose }: { title: string; state: SearchState; onChoose: ExercisePickerProps["onChoose"] }) {
  if (state.name === "loading") return <p role="status" className="text-muted">{translate("planEdit.searching")}</p>;
  if (state.name === "error") return <p role="alert" className="text-accent-strong">{translate("planEdit.searchFailed")}</p>;
  if (state.name !== "done") return null;
  if (state.items.length === 0) return <p role="status" className="text-muted">{translate("planEdit.noResults")}</p>;
  return (
    <ul aria-label={title} className="flex flex-col gap-2">
      {state.items.map((item) => (
        <li key={item.slug} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-1">
          <span>{item.name}</span>
          <button type="button" onClick={() => onChoose(item)} aria-label={translate("planEdit.choose", { name: item.name })} className={EDIT_BUTTON_CLASS}>
            {translate("planEdit.chooseText")}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Catalog search to add or swap an exercise of the workout being edited. */
export function ExercisePicker({ title, excludedSlugs, onChoose, onCancel }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ name: "idle" });
  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ name: "loading" });
    const items = await searchCatalogExercises(query);
    setState(items ? { name: "done", items: items.filter((item) => !excludedSlugs.has(item.slug)) } : { name: "error" });
  };
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-2xl border border-accent-strong bg-surface p-4">
      <h3 className="font-semibold">{title}</h3>
      <form role="search" onSubmit={(event) => void search(event)} className="flex gap-2">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={translate("planEdit.searchLabel")} className={EDIT_INPUT_CLASS} />
        <button type="submit" className={EDIT_BUTTON_CLASS}>{translate("planEdit.searchButton")}</button>
      </form>
      <SearchResults title={title} state={state} onChoose={onChoose} />
      <button type="button" onClick={onCancel} className={`${EDIT_BUTTON_CLASS} self-start`}>{translate("planEdit.cancelButton")}</button>
    </section>
  );
}
