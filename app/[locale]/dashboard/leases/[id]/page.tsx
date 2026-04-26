import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { deleteLeaseAction } from "../actions";

export default async function LeaseDetailPage({
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

  const { data: lease } = await supabase
    .from("leases")
    .select("*, properties(id, label, address, city), tenants(id, full_name, email, phone)")
    .eq("id", id)
    .maybeSingle();

  if (!lease) notFound();

  const property = Array.isArray(lease.properties)
    ? lease.properties[0]
    : (lease.properties as { id: string; label: string | null; address: string; city: string } | null);
  const tenant = Array.isArray(lease.tenants)
    ? lease.tenants[0]
    : (lease.tenants as { id: string; full_name: string; email: string | null; phone: string | null } | null);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/leases`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {dict.leases.backToList}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {property?.label ?? `${property?.address}, ${property?.city}`}
            </h1>
            <p className="mt-1 text-slate-600">{tenant?.full_name}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/${locale}/dashboard/leases/${id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {dict.leases.editLease}
            </Link>
            <form action={deleteLeaseAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                onClick={(e) => {
                  if (!confirm(dict.leases.confirmDelete)) e.preventDefault();
                }}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                {dict.leases.deleteLease}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.leases.fields.status}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {dict.leases.status[lease.status as keyof typeof dict.leases.status]}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.leases.fields.monthlyRent}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {(lease.monthly_rent_cents / 100).toFixed(2)} €
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.leases.fields.startDate}
          </p>
          <p className="mt-1 text-sm text-slate-900">{lease.start_date}</p>
        </div>
        {lease.end_date && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.leases.fields.endDate}
            </p>
            <p className="mt-1 text-sm text-slate-900">{lease.end_date}</p>
          </div>
        )}
        {lease.deposit_cents > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.leases.fields.deposit}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {(lease.deposit_cents / 100).toFixed(2)} €
            </p>
          </div>
        )}
        {property && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.leases.fields.property}
            </p>
            <Link
              href={`/${locale}/dashboard/properties/${property.id}`}
              className="mt-1 block text-sm text-brand-600 hover:underline"
            >
              {property.label ?? `${property.address}, ${property.city}`}
            </Link>
          </div>
        )}
        {tenant && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.leases.fields.tenant}
            </p>
            <Link
              href={`/${locale}/dashboard/tenants/${tenant.id}`}
              className="mt-1 block text-sm text-brand-600 hover:underline"
            >
              {tenant.full_name}
            </Link>
            {tenant.email && (
              <p className="text-xs text-slate-500">{tenant.email}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
