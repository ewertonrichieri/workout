import type { ReactNode } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { translate } from "@/lib/i18n/translate";

type SectionName = "home" | "workout" | "schedule" | "profile";

interface SectionPageProps {
  section: SectionName;
  children?: ReactNode;
}

/** Placeholder screen used until each section gets real content. */
export function SectionPage({ section, children }: SectionPageProps) {
  return (
    <>
      <PageHeader title={translate(`pages.${section}.title`)} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <EmptyState
          title={translate(`pages.${section}.emptyTitle`)}
          description={translate(`pages.${section}.emptyDescription`)}
        />
        {children}
      </main>
    </>
  );
}
