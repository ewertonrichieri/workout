import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { REDIRECT_QUERY_PARAMETER, sanitizeRedirectPath } from "@/lib/auth/route-access";
import { translate } from "@/lib/i18n/translate";

type LoginSearchParams = PageProps<"/login">["searchParams"];

async function LoginFormWithParams({ searchParams }: { searchParams: LoginSearchParams }) {
  const parameters = await searchParams;
  const nextParameter = parameters[REDIRECT_QUERY_PARAMETER];
  const next = sanitizeRedirectPath(typeof nextParameter === "string" ? nextParameter : null);
  const initialError = parameters.error ? translate("auth.errors.callbackFailed") : undefined;
  return <LoginForm next={next} initialError={initialError} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-semibold">{translate("auth.title")}</h1>
        <p className="text-neutral-500">{translate("auth.subtitle")}</p>
      </header>
      <Suspense fallback={<div aria-busy="true" className="min-h-72" />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
