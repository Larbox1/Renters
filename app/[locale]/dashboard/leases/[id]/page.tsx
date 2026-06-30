import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { signDocument } from "@/lib/documents/storage";
import { deleteLeaseAction } from "../actions";
import { LeaseDetailCards } from "../lease-detail-cards";
import { LeaseReceiptsTable, type RentReceiptRow } from "../lease-receipts-table";
import { generateRentReceiptAction } from "./receipts/actions";

export default async function LeaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { locale, id } = await params;
  const { receipt } = await searchParams;
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

  // Rent receipts (quittances de loyer) generated for this lease, newest first.
  // Each links to its generated PDF in the private documents bucket via a
  // short-lived signed URL.
  const { data: receiptRows } = await supabase
    .from("rent_receipts")
    .select("*, documents(path)")
    .eq("lease_id", id)
    .order("period_start", { ascending: false });

  const receipts: RentReceiptRow[] = await Promise.all(
    (receiptRows ?? []).map(async (r) => {
      const doc = Array.isArray(r.documents) ? r.documents[0] : r.documents;
      const path = (doc as { path: string } | null)?.path ?? null;
      return {
        id: r.id as string,
        period_start: r.period_start as string,
        period_end: r.period_end as string,
        rent_cents: r.rent_cents as number,
        charges_cents: r.charges_cents as number,
        total_cents: r.total_cents as number,
        created_at: r.created_at as string,
        url: path ? await signDocument(path) : null,
      };
    }),
  );

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

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {dict.leases.receipts.title}
          </h2>
          <div className="flex items-center gap-3">
            {receipt === "1" && (
              <span className="text-sm font-medium text-emerald-700">
                {dict.leases.receipts.generated}
              </span>
            )}
            <form action={generateRentReceiptAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="lease_id" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {dict.leases.receipts.generate}
              </button>
            </form>
          </div>
        </div>

        <LeaseReceiptsTable
          receipts={receipts}
          dict={dict.leases.receipts}
          locale={locale as Locale}
          leaseId={id}
        />
      </section>
    </div>
  );
}
