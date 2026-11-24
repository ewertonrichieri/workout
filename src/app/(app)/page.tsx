import { Suspense } from "react";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { HomeNextStep } from "@/components/plan-generation/home-next-step";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { translate } from "@/lib/i18n/translate";
import { createServerPlanGenerationService } from "@/lib/plan-generation/server-plan-generation-service";

async function HomeContent() {
  const userId = await getAuthenticatedUserId();
  const service = await createServerPlanGenerationService();
  return <HomeNextStep status={await service.getGenerationStatus(userId)} />;
}

export default function HomePage() {
  return (
    <>
      <PageHeader title={translate("pages.home.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Suspense fallback={<ListSkeleton label={translate("planGeneration.loading")} rows={2} />}>
          <HomeContent />
        </Suspense>
      </main>
    </>
  );
}
