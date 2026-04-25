"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  createLeaseAction,
  updateLeaseAction,
  type LeaseState,
} from "./actions";

type Property = { id: string; label: string | null; address: string; city: string };
type Tenant = { id: string; full_name: string };

type Lease = {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent_cents: number;
  deposit_cents: number;
  status: string;
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

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {lease && <input type="hidden" name="id" value={lease.id} />}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.property} <span className="text-red-500">*</span>
        </label>
        <select
          name="property_id"
          required
          defaultValue={lease?.property_id ?? defaultPropertyId ?? ""}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.tenant} <span className="text-red-500">*</span>
        </label>
        <select
          name="tenant_id"
          required
          defaultValue={lease?.tenant_id ?? ""}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">{dict.fields.tenantPlaceholder}</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.startDate} <span className="text-red-500">*</span>
          </label>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={lease?.start_date ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.endDate}
          </label>
          <input
            name="end_date"
            type="date"
            defaultValue={lease?.end_date ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.monthlyRent} <span className="text-red-500">*</span>
          </label>
          <input
            name="monthly_rent_cents"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={lease ? centsToEuros(lease.monthly_rent_cents) : ""}
            placeholder={dict.fields.monthlyRentPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.deposit}
          </label>
          <input
            name="deposit_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={lease ? centsToEuros(lease.deposit_cents) : "0"}
            placeholder={dict.fields.depositPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="sm:max-w-xs">
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.status}
        </label>
        <select
          name="status"
          defaultValue={lease?.status ?? "pending"}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="pending">{dict.status.pending}</option>
          <option value="active">{dict.status.active}</option>
          <option value="ended">{dict.status.ended}</option>
        </select>
      </div>

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
