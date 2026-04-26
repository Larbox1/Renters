import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";
import { SetupNotice } from "@/components/setup-notice";

export default async function ResetPasswordPage({
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The reset link goes through /auth/callback which exchanges the code for
  // a session before redirecting here. If a user lands here without a session
  // (e.g. expired link or direct visit), bounce them to the forgot-password page.
  if (!user) {
    redirect(`/${locale}/forgot-password`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.auth.resetPassword.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {dict.auth.resetPassword.subtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ResetForm locale={locale as Locale} dict={dict.auth.resetPassword} />
      </div>
    </div>
  );
}
