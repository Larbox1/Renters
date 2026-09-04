import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentSession } from "@/lib/auth/current-user";
import { SetupNotice } from "@/components/setup-notice";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) {
    return <SetupNotice locale={locale as Locale} />;
  }

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.needsOnboarding) redirect(`/${locale}/dashboard`);

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.auth.onboarding.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {dict.auth.onboarding.subtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <OnboardingForm
          locale={locale as Locale}
          dict={dict.auth.onboarding}
          signupDict={dict.auth.signup}
        />
      </div>
    </div>
  );
}
