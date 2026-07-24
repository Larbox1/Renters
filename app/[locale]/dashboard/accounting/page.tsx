import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession } from "@/lib/auth/current-user";

export default async function AccountingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (session.role !== "owner") {
    return <AccessDenied dict={dict.accessDenied} />;
  }

  return (
    <div className="px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {dict.dashboard.sidebar.accounting}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{dict.dashboard.comingSoon}</p>
    </div>
  );
}
