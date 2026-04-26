import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { ForgotForm } from "./forgot-form";
import { SetupNotice } from "@/components/setup-notice";

export default async function ForgotPasswordPage({
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

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.auth.forgotPassword.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {dict.auth.forgotPassword.subtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ForgotForm locale={locale as Locale} dict={dict.auth.forgotPassword} />
      </div>
    </div>
  );
}
