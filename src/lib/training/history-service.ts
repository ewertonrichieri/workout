import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/constants/catalog";
import { APP_TIME_ZONE, HISTORY_PAGE_SIZE, MAX_PROGRESS_SESSIONS } from "@/lib/constants/training";
import { InvalidInputError, NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { HistoryRepository } from "./history-repository";
import { buildExerciseProgress, type ExerciseProgressEntry } from "./load-history";
import { toDateInTimeZone } from "./plan-validity";

/** Port to the catalog: only what the history needs about an exercise. */
export interface ExerciseLookup {
  findBySlug(slug: string): Promise<{ id: string; slug: string; name: string } | null>;
}

export interface SessionHistoryItem {
  id: string;
  date: string;
  workoutLabel: string | null;
  setCount: number;
}

export interface SessionHistoryPage {
  items: SessionHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ExerciseProgress {
  exercise: { slug: string; name: string };
  entries: ExerciseProgressEntry[];
}

export interface HistoryService {
  listHistory(userId: string, rawPage: unknown): Promise<SessionHistoryPage>;
  getExerciseProgress(userId: string, rawSlug: unknown): Promise<ExerciseProgress>;
}

const FIRST_PAGE = 1;
const pageSchema = z.coerce.number().int().min(FIRST_PAGE).default(FIRST_PAGE);
const slugSchema = z.string().regex(SLUG_PATTERN);

function parsePage(rawPage: unknown): number {
  const parsed = pageSchema.safeParse(rawPage ?? undefined);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return parsed.data;
}

export function createHistoryService(repository: HistoryRepository, exercises: ExerciseLookup): HistoryService {
  return {
    async listHistory(userId, rawPage) {
      const page = parsePage(rawPage);
      const { items, total } = await repository.listFinishedSessions(userId, { page, pageSize: HISTORY_PAGE_SIZE });
      const sessions = items.map(({ finishedAt, ...item }) => ({ ...item, date: toDateInTimeZone(new Date(finishedAt), APP_TIME_ZONE) }));
      return { items: sessions, page, pageSize: HISTORY_PAGE_SIZE, total, totalPages: Math.ceil(total / HISTORY_PAGE_SIZE) };
    },
    async getExerciseProgress(userId, rawSlug) {
      const slug = slugSchema.safeParse(rawSlug);
      const exercise = slug.success ? await exercises.findBySlug(slug.data) : null;
      if (!exercise) throw new NotFoundError(translate("errors.notFound", { resource: translate("catalog.exerciseResource") }));
      const rows = await repository.listExerciseSetLogs(userId, exercise.id);
      return { exercise: { slug: exercise.slug, name: exercise.name }, entries: buildExerciseProgress(rows, APP_TIME_ZONE, MAX_PROGRESS_SESSIONS) };
    },
  };
}
