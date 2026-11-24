import Link from "next/link";
import { SectionPage } from "@/components/layout/section-page";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";

export default function WorkoutPage() {
  return (
    <SectionPage section="workout">
      <Link
        href={APP_ROUTES.exercises}
        className="flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
      >
        {translate("catalog.browseLink")}
      </Link>
    </SectionPage>
  );
}
