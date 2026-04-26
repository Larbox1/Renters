"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SignedPhoto } from "@/lib/properties/photos";
import { PhotoManager, type PhotoManagerHandle } from "./photo-manager";
import {
  createPropertyAction,
  updatePropertyAction,
  type PropertyState,
} from "./actions";

type Property = {
  id: string;
  owner_id?: string;
  label: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  country: string | null;
  monthly_rent_cents: number | null;
  value_cents: number | null;
  sell_price_cents: number | null;
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

export function PropertyForm({
  locale,
  dict,
  property,
  owners,
  existingPhotos = [],
}: {
  locale: Locale;
  dict: Dictionary["properties"];
  property?: Property;
  owners?: OwnerOption[];
  existingPhotos?: SignedPhoto[];
}) {
  const action = property ? updatePropertyAction : createPropertyAction;
  const [state, formAction] = useActionState<PropertyState, FormData>(action, {});
  const showOwnerSelect = Boolean(owners && owners.length > 0);
  const photoHandle = useRef<PhotoManagerHandle | null>(null);

  const centsToEuros = (cents: number | null) =>
    cents != null ? (cents / 100).toFixed(2) : "";

  // Intercept submit so we can pull photo state out of the PhotoManager and
  // inject it into the FormData. Native file inputs can't accumulate picks
  // across multiple "Add photos" clicks, so the component owns the file list.
  const onSubmit = (fd: FormData) => {
    fd.delete("keep_paths");
    fd.delete("photos");
    const handle = photoHandle.current;
    if (handle) {
      handle.getKeptPaths().forEach((p) => fd.append("keep_paths", p));
      handle.getNewFiles().forEach((f) => fd.append("photos", f));
    }
    formAction(fd);
  };

  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {property && <input type="hidden" name="id" value={property.id} />}

      {showOwnerSelect && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.owner} <span className="text-red-500">*</span>
          </label>
          <select
            name="owner_id"
            required
            defaultValue={property?.owner_id ?? ""}
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
          {dict.fields.label}
        </label>
        <input
          name="label"
          type="text"
          defaultValue={property?.label ?? ""}
          placeholder={dict.fields.labelPlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.address} <span className="text-red-500">*</span>
        </label>
        <input
          name="address"
          type="text"
          required
          defaultValue={property?.address ?? ""}
          placeholder={dict.fields.addressPlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.city} <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            type="text"
            required
            defaultValue={property?.city ?? ""}
            placeholder={dict.fields.cityPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.postalCode}
          </label>
          <input
            name="postal_code"
            type="text"
            defaultValue={property?.postal_code ?? ""}
            placeholder={dict.fields.postalCodePlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.country}
          </label>
          <input
            name="country"
            type="text"
            defaultValue={property?.country ?? "FR"}
            placeholder={dict.fields.countryPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.monthlyRent}
          </label>
          <input
            name="monthly_rent_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centsToEuros(property?.monthly_rent_cents ?? null)}
            placeholder={dict.fields.monthlyRentPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.value}
          </label>
          <input
            name="value_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centsToEuros(property?.value_cents ?? null)}
            placeholder={dict.fields.valuePlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="sm:max-w-xs">
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.sellPrice}
        </label>
        <input
          name="sell_price_cents"
          type="number"
          min="0"
          step="0.01"
          defaultValue={centsToEuros(property?.sell_price_cents ?? null)}
          placeholder={dict.fields.valuePlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-slate-500">{dict.fields.sellPriceHint}</p>
      </div>

      <PhotoManager
        dict={dict.photos}
        existing={existingPhotos}
        registerHandle={(h) => {
          photoHandle.current = h;
        }}
      />

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
