import { signOutAction } from "@/app/login/actions";
import { translate } from "@/lib/i18n/translate";

// Temporary home until the base layout (step 0.8).
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
      <h1 className="text-3xl font-semibold">{translate("app.name")}</h1>
      <p>{translate("auth.signedInPlaceholder")}</p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg border border-neutral-400 px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {translate("auth.signOutButton")}
        </button>
      </form>
    </main>
  );
}
