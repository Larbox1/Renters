"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  createTenantAction,
  updateTenantAction,
  type TenantState,
} from "./actions";

type Tenant = {
  id: string;
  owner_id?: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type OwnerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
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

export function TenantForm({
  locale,
  dict,
  tenant,
  owners,
}: {
  locale: Locale;
  dict: Dictionary["tenants"];
  tenant?: Tenant;
  owners?: OwnerOption[];
}) {
  const action = tenant ? updateTenantAction : createTenantAction;
  const [state, formAction] = useActionState<TenantState, FormData>(action, {});
  const showOwnerSelect = Boolean(owners && owners.length > 0);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {tenant && <input type="hidden" name="id" value={tenant.id} />}

      {showOwnerSelect && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.owner} <span className="text-red-500">*</span>
          </label>
          <select
            name="owner_id"
            required
            defaultValue={tenant?.owner_id ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="" disabled>
              —
            </option>
            {owners!.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name ?? o.email ?? o.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.fullName} <span className="text-red-500">*</span>
        </label>
        <input
          name="full_name"
          type="text"
          required
          defaultValue={tenant?.full_name ?? ""}
          placeholder={dict.fields.fullNamePlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.email}
        </label>
        <input
          name="email"
          type="email"
          defaultValue={tenant?.email ?? ""}
          placeholder={dict.fields.emailPlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {!tenant && (
          <p className="mt-1 text-xs text-slate-500">{dict.fields.emailHint}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.phone}
        </label>
        <input
          name="phone"
          type="tel"
          defaultValue={tenant?.phone ?? ""}
          placeholder={dict.fields.phonePlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.notes}
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={tenant?.notes ?? ""}
          placeholder={dict.fields.notesPlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
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
