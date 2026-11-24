import { formatCalendarDate } from "@/components/workout/workout-labels";
import { APP_ROUTES, PAGE_QUERY_PARAM } from "@/lib/constants/routes";
import { APP_LOCALE, LOAD_DECIMAL_PLACES } from "@/lib/constants/training";
import { translate } from "@/lib/i18n/translate";

const FIRST_PAGE = 1;
const loadFormatter = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: LOAD_DECIMAL_PLACES });

/** "22,5 kg" */
export function describeLoad(loadKg: number): string {
  return translate("history.loadValue", { value: loadFormatter.format(loadKg) });
}

/** "24/11" for the chart axis. */
export function formatShortDate(isoDate: string): string {
  return formatCalendarDate(isoDate).slice(0, "DD/MM".length);
}

export function buildScheduleHref(page: number): string {
  return page > FIRST_PAGE ? `${APP_ROUTES.schedule}?${PAGE_QUERY_PARAM}=${page}` : APP_ROUTES.schedule;
}

export function buildProgressHref(slug: string): string {
  return `${APP_ROUTES.progress}/${slug}`;
}

export { formatCalendarDate };
