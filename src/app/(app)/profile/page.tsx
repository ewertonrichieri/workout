import { signOutAction } from "@/app/login/actions";
import { SectionPage } from "@/components/layout/section-page";
import { translate } from "@/lib/i18n/translate";

export default function ProfilePage() {
  return (
    <SectionPage section="profile">
      <form action={signOutAction}>
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        >
          {translate("auth.signOutButton")}
        </button>
      </form>
    </SectionPage>
  );
}
