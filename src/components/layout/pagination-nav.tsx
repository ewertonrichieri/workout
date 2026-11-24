import Link from "next/link";
import { translate } from "@/lib/i18n/translate";

interface PaginationNavProps {
  label: string;
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

const FIRST_PAGE = 1;
const LINK_CLASS =
  "flex min-h-11 items-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

/** Previous/next links with "Página N de M"; hidden by the caller when there is a single page. */
export function PaginationNav({ label, page, totalPages, buildHref }: PaginationNavProps) {
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2">
      {page > FIRST_PAGE ? <Link href={buildHref(page - 1)} className={LINK_CLASS}>{translate("pagination.previous")}</Link> : <span />}
      <span className="text-sm text-muted">{translate("pagination.status", { page, totalPages })}</span>
      {page < totalPages ? <Link href={buildHref(page + 1)} className={LINK_CLASS}>{translate("pagination.next")}</Link> : <span />}
    </nav>
  );
}
