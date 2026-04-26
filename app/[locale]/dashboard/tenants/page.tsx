import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";

export default async function TenantsPage({
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
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name, email, phone")
    .order("full_name", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.tenants.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/tenants/new`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.tenants.newTenant}
        </Link>
      </div>

      {!tenants || tenants.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.tenants.noTenants}</p>
      ) : (
        <ul className="space-y-3">
          {tenants.map((t) => (
            <li key={t.id}>
              <Link
                href={`/${locale}/dashboard/tenants/${t.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{t.full_name}</p>
                  {t.email && (
                    <p className="text-sm text-slate-500">{t.email}</p>
                  )}
                </div>
                {t.phone && (
                  <span className="text-sm text-slate-500">{t.phone}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
