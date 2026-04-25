import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { deletePropertyAction } from "../actions";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "tenant";
  if (role !== "owner" && role !== "admin") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">{dict.accessDenied.title}</h1>
        <p className="mt-2 text-slate-600">{dict.accessDenied.message}</p>
      </div>
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  const { data: leases } = await supabase
    .from("leases")
    .select("id, status, start_date, end_date, monthly_rent_cents, tenant_id, tenants(full_name)")
    .eq("property_id", id)
    .order("start_date", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/properties`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.properties.backToList}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {property.label ?? `${property.address}, ${property.city}`}
            </h1>
            <p className="mt-1 text-slate-600">
              {property.address}, {property.city}
              {property.postal_code ? ` ${property.postal_code}` : ""}
              {property.country ? `, ${property.country}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/${locale}/dashboard/properties/${id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {dict.properties.editProperty}
            </Link>
            <form action={deletePropertyAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                onClick={(e) => {
                  if (!confirm(dict.properties.confirmDelete)) e.preventDefault();
                }}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                {dict.properties.deleteProperty}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {property.monthly_rent_cents != null && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.properties.fields.monthlyRent}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {(property.monthly_rent_cents / 100).toFixed(2)} €
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {dict.properties.leasesOnProperty}
          </h2>
          <Link
            href={`/${locale}/dashboard/leases/new?property_id=${id}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            + {dict.leases.newLease}
          </Link>
        </div>

        {!leases || leases.length === 0 ? (
          <p className="text-sm text-slate-600">{dict.properties.noLeases}</p>
        ) : (
          <ul className="space-y-3">
            {leases.map((l) => {
              const tenantName = Array.isArray(l.tenants)
                ? l.tenants[0]?.full_name
                : (l.tenants as { full_name: string } | null)?.full_name;
              return (
                <li key={l.id}>
                  <Link
                    href={`/${locale}/dashboard/leases/${l.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{tenantName}</p>
                      <p className="text-sm text-slate-500">
                        {l.start_date}
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
    </div>
  );
}
