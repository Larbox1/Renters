import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

type LeaseRecord = {
  status: string;
  type: string | null;
  monthly_rent_cents: number;
  deposit_cents: number;
  start_date: string;
  end_date: string | null;
} & BailVideLease;

type PropertyRef = {
  id: string;
  label: string | null;
  address: string;
  city: string;
} | null;

type TenantRef = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
} | null;

/**
 * Read-only card grid describing a lease, shared by the owner/admin lease
 * detail page and the tenant-facing "My Lease" page. The owner view links the
 * property and tenant cards to their detail pages; the tenant view renders them
 * as plain text since tenants can't reach those owner-only routes (linkRefs).
 */
export function LeaseDetailCards({
  lease,
  property,
  tenant,
  dict,
  locale,
  linkRefs,
}: {
  lease: LeaseRecord;
  property: PropertyRef;
  tenant: TenantRef;
  dict: Dictionary["leases"];
  locale: Locale;
  linkRefs: boolean;
}) {
  const propertyName =
    property?.label ?? `${property?.address}, ${property?.city}`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.fields.status}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {dict.status[lease.status as keyof typeof dict.status]}
          </p>
        </div>
        {lease.type && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.fields.type}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {dict.types[lease.type as keyof typeof dict.types] ?? lease.type}
            </p>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.fields.monthlyRent}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {(lease.monthly_rent_cents / 100).toFixed(2)} €
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.fields.startDate}
          </p>
          <p className="mt-1 text-sm text-slate-900">{lease.start_date}</p>
        </div>
        {lease.end_date && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.fields.endDate}
            </p>
            <p className="mt-1 text-sm text-slate-900">{lease.end_date}</p>
          </div>
        )}
        {lease.deposit_cents > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.fields.deposit}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {(lease.deposit_cents / 100).toFixed(2)} €
            </p>
          </div>
        )}
        {property && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.fields.property}
            </p>
            {linkRefs ? (
              <Link
                href={`/${locale}/dashboard/properties/${property.id}`}
                className="mt-1 block text-sm text-brand-600 hover:underline"
              >
                {propertyName}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-slate-900">{propertyName}</p>
            )}
          </div>
        )}
        {tenant && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.fields.tenant}
            </p>
            {linkRefs ? (
              <Link
                href={`/${locale}/dashboard/tenants/${tenant.id}`}
                className="mt-1 block text-sm text-brand-600 hover:underline"
              >
                {tenant.full_name}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-slate-900">{tenant.full_name}</p>
            )}
            {tenant.email && (
              <p className="text-xs text-slate-500">{tenant.email}</p>
            )}
          </div>
        )}
      </div>

      {(lease.type === "bail_vide" || lease.type === "bail_meuble") && (
        <BailVideDetails lease={lease} dict={dict.fields.bailVide} />
      )}
    </>
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
            <dd className="text-sm font-medium text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
