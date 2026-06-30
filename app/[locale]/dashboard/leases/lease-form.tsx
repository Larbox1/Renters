"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  createLeaseAction,
  updateLeaseAction,
  type LeaseState,
} from "./actions";

type Property = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  monthly_rent_cents: number | null;
};
type Tenant = { id: string; full_name: string };

type LeaseTypeValue =
  | "bail_vide"
  | "bail_meuble"
  | "bail_mobilite"
  | "bail_etudiant"
  | "bail_civil"
  | "bail_commercial";

const LEASE_TYPES: LeaseTypeValue[] = [
  "bail_vide",
  "bail_meuble",
  "bail_mobilite",
  "bail_etudiant",
  "bail_civil",
  "bail_commercial",
];

type LeaseDuration =
  | "3_years"
  | "6_years"
  | "1_year"
  | "9_months_student"
  | "reduced";
type ChargesMethod = "provisions" | "periodic" | "flat_rate";
type PaymentTiming = "in_advance" | "arrears";
type DpeClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

const DPE_CLASSES: DpeClass[] = ["A", "B", "C", "D", "E", "F", "G"];

type Lease = {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent_cents: number;
  deposit_cents: number;
  status: string;
  type: LeaseTypeValue | null;
  duration: LeaseDuration | null;
  reduced_duration_months: number | null;
  reduced_duration_reason: string | null;
  irl_reference: string | null;
  revision_date: string | null;
  rent_supplement_cents: number | null;
  is_zone_tendue: boolean;
  reference_rent_cents_per_sqm: number | null;
  reference_rent_capped_cents_per_sqm: number | null;
  charges_method: ChargesMethod | null;
  charges_amount_cents: number | null;
  payment_day_of_month: number | null;
  payment_timing: PaymentTiming | null;
  dpe_class: DpeClass | null;
  annual_energy_cost_cents: number | null;
  tenant_fees_cents: number | null;
  tenant_inventory_fees_cents: number | null;
};

function SubmitButton({ labels }: { labels: { idle: string; busy: string } }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? labels.busy : labels.idle}
    </button>
  );
}

export function LeaseForm({
  locale,
  dict,
  properties,
  tenants,
  lease,
  defaultPropertyId,
}: {
  locale: Locale;
  dict: Dictionary["leases"];
  properties: Property[];
  tenants: Tenant[];
  lease?: Lease;
  defaultPropertyId?: string;
}) {
  const action = lease ? updateLeaseAction : createLeaseAction;
  const [state, formAction] = useActionState<LeaseState, FormData>(action, {});

  const centsToEuros = (cents: number) => (cents / 100).toFixed(2);

  const propertyRentMap = new Map(
    properties.map((p) => [p.id, p.monthly_rent_cents] as const),
  );
  const rentRef = useRef<HTMLInputElement>(null);

  const handlePropertyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const cents = propertyRentMap.get(e.target.value);
    if (cents != null && rentRef.current) {
      rentRef.current.value = centsToEuros(cents);
    }
  };

  const [selectedType, setSelectedType] = useState<LeaseTypeValue | "">(
    lease?.type ?? "",
  );
  const [duration, setDuration] = useState<LeaseDuration | "">(
    lease?.duration ?? "",
  );
  const [isZoneTendue, setIsZoneTendue] = useState<boolean>(
    lease?.is_zone_tendue ?? false,
  );

  const showContractDetails =
    selectedType === "bail_vide" || selectedType === "bail_meuble";
  const showCivilCommercial =
    selectedType === "bail_civil" || selectedType === "bail_commercial";
  const isMeuble = selectedType === "bail_meuble";
  const bv = dict.fields.bailVide;
  const durationOptions: LeaseDuration[] = isMeuble
    ? ["1_year", "9_months_student", "reduced"]
    : ["3_years", "6_years", "reduced"];
  const durationLabel = (d: LeaseDuration) => {
    switch (d) {
      case "3_years":
        return bv.duration3y;
      case "6_years":
        return bv.duration6y;
      case "1_year":
        return bv.duration1y;
      case "9_months_student":
        return bv.duration9mStudent;
      case "reduced":
        return bv.durationReduced;
    }
  };

  const inputClass =
    "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
  const selectClass =
    "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
  const labelClass = "block text-sm font-medium text-slate-700";
  const subheadingClass =
    "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {lease && <input type="hidden" name="id" value={lease.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            {dict.fields.property} <span className="text-red-500">*</span>
          </label>
          <select
            name="property_id"
            required
            defaultValue={lease?.property_id ?? defaultPropertyId ?? ""}
            onChange={handlePropertyChange}
            className={selectClass}
          >
            <option value="">{dict.fields.propertyPlaceholder}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label ?? `${p.address}, ${p.city}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            {dict.fields.tenant} <span className="text-red-500">*</span>
          </label>
          <select
            name="tenant_id"
            required
            defaultValue={lease?.tenant_id ?? ""}
            className={selectClass}
          >
            <option value="">{dict.fields.tenantPlaceholder}</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>{dict.fields.type}</label>
          <select
            name="type"
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as LeaseTypeValue | "")
            }
            className={selectClass}
          >
            <option value="">{dict.fields.typePlaceholder}</option>
            {LEASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {dict.types[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{dict.fields.status}</label>
          <select
            name="status"
            defaultValue={lease?.status ?? "pending"}
            className={selectClass}
          >
            <option value="pending">{dict.status.pending}</option>
            <option value="active">{dict.status.active}</option>
            <option value="ended">{dict.status.ended}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            {dict.fields.startDate} <span className="text-red-500">*</span>
          </label>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={lease?.start_date ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{dict.fields.endDate}</label>
          <input
            name="end_date"
            type="date"
            defaultValue={lease?.end_date ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            {dict.fields.monthlyRent} <span className="text-red-500">*</span>
          </label>
          <input
            ref={rentRef}
            name="monthly_rent_cents"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={
              lease
                ? centsToEuros(lease.monthly_rent_cents)
                : defaultPropertyId &&
                    propertyRentMap.get(defaultPropertyId) != null
                  ? centsToEuros(propertyRentMap.get(defaultPropertyId)!)
                  : ""
            }
            placeholder={dict.fields.monthlyRentPlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{dict.fields.deposit}</label>
          <input
            name="deposit_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={lease ? centsToEuros(lease.deposit_cents) : "0"}
            placeholder={dict.fields.depositPlaceholder}
            className={inputClass}
          />
          {showContractDetails && (
            <p className="mt-1 text-xs text-slate-500">
              {isMeuble ? bv.depositHintMeuble : bv.depositHintVide}
            </p>
          )}
        </div>
      </div>

      {showContractDetails && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-base font-semibold text-slate-900">
            {isMeuble ? bv.sectionTitleMeuble : bv.sectionTitle}
          </h2>

          <div className="space-y-3">
            <p className={subheadingClass}>{bv.durationGroup}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              {durationOptions.map((d) => (
                <label key={d} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="duration"
                    value={d}
                    checked={duration === d}
                    onChange={() => setDuration(d)}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                  />
                  {durationLabel(d)}
                </label>
              ))}
            </div>
            {duration === "reduced" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    {bv.reducedDurationMonths}
                  </label>
                  <input
                    name="reduced_duration_months"
                    type="number"
                    min="1"
                    max="36"
                    defaultValue={lease?.reduced_duration_months ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {bv.reducedDurationReason}
                  </label>
                  <input
                    name="reduced_duration_reason"
                    type="text"
                    defaultValue={lease?.reduced_duration_reason ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className={subheadingClass}>{bv.rentRevisionGroup}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{bv.irlReference}</label>
                <input
                  name="irl_reference"
                  type="text"
                  defaultValue={lease?.irl_reference ?? ""}
                  placeholder={bv.irlReferencePlaceholder}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{bv.revisionDate}</label>
                <input
                  name="revision_date"
                  type="date"
                  defaultValue={lease?.revision_date ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_zone_tendue"
                checked={isZoneTendue}
                onChange={(e) => setIsZoneTendue(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {bv.isZoneTendue}
            </label>
            {isZoneTendue && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>{bv.referenceRent}</label>
                  <input
                    name="reference_rent_cents_per_sqm"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={
                      lease?.reference_rent_cents_per_sqm != null
                        ? centsToEuros(lease.reference_rent_cents_per_sqm)
                        : ""
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{bv.referenceRentCapped}</label>
                  <input
                    name="reference_rent_capped_cents_per_sqm"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={
                      lease?.reference_rent_capped_cents_per_sqm != null
                        ? centsToEuros(lease.reference_rent_capped_cents_per_sqm)
                        : ""
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            )}
            <div>
              <label className={labelClass}>{bv.rentSupplement}</label>
              <input
                name="rent_supplement_cents"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  lease?.rent_supplement_cents != null
                    ? centsToEuros(lease.rent_supplement_cents)
                    : ""
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                {bv.rentSupplementHint}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className={subheadingClass}>{bv.chargesGroup}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{bv.chargesMethod}</label>
                <select
                  name="charges_method"
                  defaultValue={lease?.charges_method ?? ""}
                  className={selectClass}
                >
                  <option value="">{bv.chargesMethodPlaceholder}</option>
                  <option value="provisions">{bv.chargesProvisions}</option>
                  <option value="periodic">{bv.chargesPeriodic}</option>
                  <option value="flat_rate">{bv.chargesFlatRate}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{bv.chargesAmount}</label>
                <input
                  name="charges_amount_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    lease?.charges_amount_cents != null
                      ? centsToEuros(lease.charges_amount_cents)
                      : ""
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className={subheadingClass}>{bv.paymentGroup}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{bv.paymentDay}</label>
                <input
                  name="payment_day_of_month"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={lease?.payment_day_of_month ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{bv.paymentTiming}</label>
                <select
                  name="payment_timing"
                  defaultValue={lease?.payment_timing ?? ""}
                  className={selectClass}
                >
                  <option value="">{bv.paymentTimingPlaceholder}</option>
                  <option value="in_advance">{bv.paymentInAdvance}</option>
                  <option value="arrears">{bv.paymentArrears}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className={subheadingClass}>{bv.dpeGroup}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{bv.dpeClass}</label>
                <select
                  name="dpe_class"
                  defaultValue={lease?.dpe_class ?? ""}
                  className={selectClass}
                >
                  <option value="">{bv.dpeClassPlaceholder}</option>
                  {DPE_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{bv.annualEnergyCost}</label>
                <input
                  name="annual_energy_cost_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    lease?.annual_energy_cost_cents != null
                      ? centsToEuros(lease.annual_energy_cost_cents)
                      : ""
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className={subheadingClass}>{bv.feesGroup}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{bv.tenantFees}</label>
                <input
                  name="tenant_fees_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    lease?.tenant_fees_cents != null
                      ? centsToEuros(lease.tenant_fees_cents)
                      : ""
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{bv.tenantInventoryFees}</label>
                <input
                  name="tenant_inventory_fees_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    lease?.tenant_inventory_fees_cents != null
                      ? centsToEuros(lease.tenant_inventory_fees_cents)
                      : ""
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showCivilCommercial && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-base font-semibold text-slate-900">
            {dict.types[selectedType as LeaseTypeValue]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>{bv.irlReference}</label>
              <input
                name="irl_reference"
                type="text"
                defaultValue={lease?.irl_reference ?? ""}
                placeholder={bv.irlReferencePlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{bv.revisionDate}</label>
              <input
                name="revision_date"
                type="date"
                defaultValue={lease?.revision_date ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{bv.chargesAmount}</label>
              <input
                name="charges_amount_cents"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  lease?.charges_amount_cents != null
                    ? centsToEuros(lease.charges_amount_cents)
                    : ""
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{bv.paymentDay}</label>
              <input
                name="payment_day_of_month"
                type="number"
                min="1"
                max="31"
                defaultValue={lease?.payment_day_of_month ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{bv.paymentTiming}</label>
              <select
                name="payment_timing"
                defaultValue={lease?.payment_timing ?? ""}
                className={selectClass}
              >
                <option value="">{bv.paymentTimingPlaceholder}</option>
                <option value="in_advance">{bv.paymentInAdvance}</option>
                <option value="arrears">{bv.paymentArrears}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">{dict.form.errorGeneric}</p>
          <p className="mt-1 text-xs text-red-600">{state.error}</p>
        </div>
      )}

      <SubmitButton labels={{ idle: dict.form.submit, busy: dict.form.submitting }} />
    </form>
  );
}
