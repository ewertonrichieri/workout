"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DELETE_UNDO_WINDOW_MS, TECHNIQUE_ANALYSES_ENDPOINT } from "@/lib/constants/technique-analysis";
import { fetchJsonData, sendDeleteRequest } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { techniqueHistoryEntrySchema, type TechniqueHistoryEntry } from "@/lib/technique-analysis/technique-history-schema";

const historyPageSchema = z.object({ items: z.array(techniqueHistoryEntrySchema), total: z.number().int(), page: z.number().int() });

type LoadStatus = "loading" | "ready" | "error";
interface PendingDeletion {
  item: TechniqueHistoryEntry;
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

function buildPageUrl(exerciseSlug: string, page: number): string {
  return `${TECHNIQUE_ANALYSES_ENDPOINT}?${new URLSearchParams({ exercise: exerciseSlug, page: String(page) })}`;
}

function insertAt(items: readonly TechniqueHistoryEntry[], item: TechniqueHistoryEntry, index: number): TechniqueHistoryEntry[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function useHistoryPages(exerciseSlug: string) {
  const [items, setItems] = useState<TechniqueHistoryEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loaded, setLoaded] = useState({ page: 0, total: 0 });
  const loadPage = useCallback((page: number) => {
    void fetchJsonData(buildPageUrl(exerciseSlug, page), historyPageSchema, translate("technique.history.loadError")).then((result) => {
      if (!result.ok) return setStatus("error");
      setItems((current) => (page === 1 ? result.data.items : [...current, ...result.data.items]));
      setLoaded({ page: result.data.page, total: result.data.total });
      setStatus("ready");
    });
  }, [exerciseSlug]);
  useEffect(() => loadPage(1), [loadPage]);
  const reload = () => {
    setStatus("loading");
    loadPage(1);
  };
  return { items, setItems, status, loaded, setLoaded, loadMore: () => loadPage(loaded.page + 1), reload };
}

/** Technique history of one exercise (step 5.5): pages, and "Apagar" with an undo window before the real deletion (D9). */
export function useTechniqueHistory(exerciseSlug: string) {
  const pages = useHistoryPages(exerciseSlug);
  const { setItems, setLoaded } = pages;
  const [pending, setPending] = useState<PendingDeletion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pendingRef = useRef<PendingDeletion | null>(null);

  const commit = useCallback((deletion: PendingDeletion) => {
    clearTimeout(deletion.timer);
    if (pendingRef.current === deletion) pendingRef.current = null;
    setPending((current) => (current === deletion ? null : current));
    void sendDeleteRequest(`${TECHNIQUE_ANALYSES_ENDPOINT}/${deletion.item.id}`, translate("technique.history.deleteFailed"), { keepalive: true }).then((result) => {
      if (result.ok) return setLoaded((current) => ({ ...current, total: current.total - 1 }));
      setItems((current) => insertAt(current, deletion.item, deletion.index));
      setDeleteError(translate("technique.history.deleteFailed"));
    });
  }, [setItems, setLoaded]);

  const remove = (item: TechniqueHistoryEntry) => {
    if (pendingRef.current) commit(pendingRef.current);
    const index = pages.items.findIndex((candidate) => candidate.id === item.id);
    const deletion: PendingDeletion = { item, index, timer: setTimeout(() => commit(deletion), DELETE_UNDO_WINDOW_MS) };
    pendingRef.current = deletion;
    setPending(deletion);
    setDeleteError(null);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
  };

  const undo = () => {
    const deletion = pendingRef.current;
    if (!deletion) return;
    clearTimeout(deletion.timer);
    pendingRef.current = null;
    setPending(null);
    setItems((current) => insertAt(current, deletion.item, deletion.index));
  };

  // Leaving the screen inside the undo window still deletes (keepalive request).
  useEffect(() => () => {
    if (pendingRef.current) commit(pendingRef.current);
  }, [commit]);

  return { ...pages, hasPending: pending !== null, deleteError, remove, undo };
}
