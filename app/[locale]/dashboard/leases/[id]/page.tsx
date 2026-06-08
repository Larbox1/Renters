import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { ConfirmSubmit } from "@/components/confirm-submit";
import type { Dictionary } from "@/i18n/dictionaries/en";
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
            {(lease.type === "bail_vide" || lease.type === "bail_meuble") && (
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.leases.fields.status}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {dict.leases.status[lease.status as keyof typeof dict.leases.status]}
          </p>
        </div>
        {lease.type && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.leases.fields.type}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {dict.leases.types[
                lease.type as keyof typeof dict.leases.types
              ] ?? lease.type}
            </p>
          </div>
        )}
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

      {(lease.type === "bail_vide" || lease.type === "bail_meuble") && (
        <BailVideDetails lease={lease} dict={dict.leases.fields.bailVide} />
      )}
    </div>
  );
}

type BailVideLease = {
  duration:
    | "3_years"
    | "6_years"
    | "1_year"
    | "9_months_student"
    | "reduced"
    | null;
  reduced_duration_months: number | null;
  reduced_duration_reason: string | null;
  irl_reference: string | null;
  revision_date: string | null;
  rent_supplement_cents: number | null;
  is_zone_tendue: boolean;
  reference_rent_cents_per_sqm: number | null;
  reference_rent_capped_cents_per_sqm: number | null;
  charges_method: "provisions" | "periodic" | "flat_rate" | null;
  charges_amount_cents: number | null;
  payment_day_of_month: number | null;
  payment_timing: "in_advance" | "arrears" | null;
  dpe_class: "A" | "B" | "C" | "D" | "E" | "F" | "G" | null;
  annual_energy_cost_cents: number | null;
  tenant_fees_cents: number | null;
  tenant_inventory_fees_cents: number | null;
};

function BailVideDetails({
  lease,
  dict,
}: {
  lease: BailVideLease;
  dict: Dictionary["leases"]["fields"]["bailVide"];
}) {
  const fmtEuros = (cents: number) => `${(cents / 100).toFixed(2)} €`;

  const durationLabel =
    lease.duration === "3_years"
      ? dict.duration3y
      : lease.duration === "6_years"
        ? dict.duration6y
        : lease.duration === "1_year"
          ? dict.duration1y
          : lease.duration === "9_months_student"
            ? dict.duration9mStudent
            : lease.duration === "reduced"
              ? `${dict.durationReduced}${
                  lease.reduced_duration_months
                    ? ` · ${lease.reduced_duration_months} ${dict.reducedDurationMonths.toLowerCase()}`
                    : ""
                }`
              : null;

  const chargesMethodLabel =
    lease.charges_method === "provisions"
      ? dict.chargesProvisions
      : lease.charges_method === "periodic"
        ? dict.chargesPeriodic
        : lease.charges_method === "flat_rate"
          ? dict.chargesFlatRate
          : null;

  const paymentTimingLabel =
    lease.payment_timing === "in_advance"
      ? dict.paymentInAdvance
      : lease.payment_timing === "arrears"
        ? dict.paymentArrears
        : null;

  const items: { label: string; value: React.ReactNode }[] = [];
  if (durationLabel)
    items.push({ label: dict.durationGroup, value: durationLabel });
  if (lease.reduced_duration_reason)
    items.push({
      label: dict.reducedDurationReason,
      value: lease.reduced_duration_reason,
    });
  if (lease.irl_reference)
    items.push({ label: dict.irlReference, value: lease.irl_reference });
  if (lease.revision_date)
    items.push({ label: dict.revisionDate, value: lease.revision_date });
  if (lease.rent_supplement_cents != null)
    items.push({
      label: dict.rentSupplement,
      value: fmtEuros(lease.rent_supplement_cents),
    });
  if (lease.is_zone_tendue) {
    items.push({ label: dict.isZoneTendue, value: "✓" });
    if (lease.reference_rent_cents_per_sqm != null)
      items.push({
        label: dict.referenceRent,
        value: `${fmtEuros(lease.reference_rent_cents_per_sqm)}/m²`,
      });
    if (lease.reference_rent_capped_cents_per_sqm != null)
      items.push({
        label: dict.referenceRentCapped,
        value: `${fmtEuros(lease.reference_rent_capped_cents_per_sqm)}/m²`,
      });
  }
  if (chargesMethodLabel)
    items.push({ label: dict.chargesMethod, value: chargesMethodLabel });
  if (lease.charges_amount_cents != null)
    items.push({
      label: dict.chargesAmount,
      value: fmtEuros(lease.charges_amount_cents),
    });
  if (lease.payment_day_of_month != null)
    items.push({
      label: dict.paymentDay,
      value: String(lease.payment_day_of_month),
    });
  if (paymentTimingLabel)
    items.push({ label: dict.paymentTiming, value: paymentTimingLabel });
  if (lease.dpe_class)
    items.push({ label: dict.dpeClass, value: lease.dpe_class });
  if (lease.annual_energy_cost_cents != null)
    items.push({
      label: dict.annualEnergyCost,
      value: fmtEuros(lease.annual_energy_cost_cents),
    });
  if (lease.tenant_fees_cents != null)
    items.push({
      label: dict.tenantFees,
      value: fmtEuros(lease.tenant_fees_cents),
    });
  if (lease.tenant_inventory_fees_cents != null)
    items.push({
      label: dict.tenantInventoryFees,
      value: fmtEuros(lease.tenant_inventory_fees_cents),
    });

  if (items.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {dict.sectionTitle}
      </p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className="text-sm font-medium text-slate-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
