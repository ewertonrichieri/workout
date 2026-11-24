import Link from "next/link";
import { SectionPage } from "@/components/layout/section-page";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";

export default function HomePage() {
  return (
    <SectionPage section="home">
      <Link
        href={APP_ROUTES.assessment}
        className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
      >
        {translate("assessment.startLink")}
      </Link>
    </SectionPage>
  );
}
