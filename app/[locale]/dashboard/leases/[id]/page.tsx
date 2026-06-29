import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteLeaseAction } from "../actions";
import { LeaseDetailCards } from "../lease-detail-cards";

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
    <div className="px-6 py-12">
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
          <div className="flex shrink-0 flex-wrap gap-2">
            {(lease.type === "bail_vide" ||
              lease.type === "bail_meuble" ||
              lease.type === "bail_civil" ||
              lease.type === "bail_commercial") && (
              <Link
                href={`/${locale}/dashboard/leases/${id}/contract`}
                target="_blank"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {dict.leases.generateContract}
              </Link>
            )}
            <Link
              href={`/${locale}/dashboard/leases/${id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {dict.leases.editLease}
            </Link>
            <form action={deleteLeaseAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit
                message={dict.leases.confirmDelete}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                {dict.leases.deleteLease}
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </div>

      <LeaseDetailCards
        lease={lease}
        property={property}
        tenant={tenant}
        dict={dict.leases}
        locale={locale as Locale}
        linkRefs
      />
    </div>
  );
}
