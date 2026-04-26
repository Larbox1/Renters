import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";

export default async function LeasesPage({
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

  const { data: leases } = await supabase
    .from("leases")
    .select("id, status, start_date, end_date, monthly_rent_cents, properties(label, address, city), tenants(full_name)")
    .order("start_date", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.leases.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/leases/new`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.leases.newLease}
        </Link>
      </div>

      {!leases || leases.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.leases.noLeases}</p>
      ) : (
        <ul className="space-y-3">
          {leases.map((l) => {
            const property = Array.isArray(l.properties)
              ? l.properties[0]
              : (l.properties as { label: string | null; address: string; city: string } | null);
            const tenant = Array.isArray(l.tenants)
              ? l.tenants[0]
              : (l.tenants as { full_name: string } | null);

            return (
              <li key={l.id}>
                <Link
                  href={`/${locale}/dashboard/leases/${l.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {property?.label ?? `${property?.address}, ${property?.city}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      {tenant?.full_name} · {l.start_date}
                      {l.end_date ? ` → ${l.end_date}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                      {dict.leases.status[l.status as keyof typeof dict.leases.status]}
                    </span>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {(l.monthly_rent_cents / 100).toFixed(2)} €/mo
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
