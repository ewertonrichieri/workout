import Link from "next/link";
import { signOutAction } from "@/app/login/actions";
import { SectionPage } from "@/components/layout/section-page";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";

const SECONDARY_ACTION_CLASS =
  "flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

export default function ProfilePage() {
  return (
    <SectionPage section="profile">
      <Link href={APP_ROUTES.assessment} className={SECONDARY_ACTION_CLASS}>
        {translate("assessment.editLink")}
      </Link>
      <form action={signOutAction}>
        <button type="submit" className={SECONDARY_ACTION_CLASS}>
          {translate("auth.signOutButton")}
        </button>
      </form>
    </SectionPage>
  );
}
