import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { TenantForm } from "../../tenant-form";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/tenants/${id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.tenants.backToList}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {dict.tenants.form.editTitle}
        </h1>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <TenantForm locale={locale as Locale} dict={dict.tenants} tenant={tenant} />
      </div>
    </div>
  );
}
