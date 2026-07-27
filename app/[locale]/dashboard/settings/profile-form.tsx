"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { OPERATION_COUNTRIES } from "@/lib/operation-country";
import {
  updateProfileAction,
  type ProfileState,
} from "./actions";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  iban: string | null;
  bic: string | null;
  operation_country: "FR" | "US" | null;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

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

export function ProfileForm({
  locale,
  dict,
  profile,
  email,
  showOperationCountry,
}: {
  locale: Locale;
  dict: Dictionary["settings"]["profile"];
  profile: Profile;
  email: string;
  showOperationCountry: boolean;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    {},
  );

  const isUS = profile.operation_country === "US";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className={labelClass}>{dict.email}</label>
        <input
          type="email"
          value={email}
          readOnly
          disabled
          className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{dict.firstName}</label>
          <input
            name="first_name"
            type="text"
            defaultValue={profile.first_name ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{dict.lastName}</label>
          <input
            name="last_name"
            type="text"
            defaultValue={profile.last_name ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AddressAutocomplete
          searchingLabel={dict.addressSearching}
          noResultsLabel={dict.addressNoResults}
          addressColSpanClass="sm:col-span-3"
          disableSearch={isUS}
          address={{ name: "address", label: dict.address }}
          city={{ name: "city", label: dict.city }}
          postalCode={{
            name: "postal_code",
            label: isUS ? dict.zipCode : dict.postalCode,
          }}
          defaults={{
            address: profile.address ?? "",
            city: profile.city ?? "",
            postalCode: profile.postal_code ?? "",
          }}
        />
        <div>
          <label className={labelClass}>{dict.country}</label>
          <input
            name="country"
            type="text"
            defaultValue={profile.country ?? "FR"}
            className={inputClass}
          />
        </div>
      </div>

      <div className="sm:max-w-xs">
        <label className={labelClass}>{dict.phone}</label>
        <input
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          className={inputClass}
        />
      </div>

      {showOperationCountry && (
        <div className="sm:max-w-xs">
          <label className={labelClass}>{dict.operationCountry}</label>
          <select
            name="operation_country"
            defaultValue={profile.operation_country ?? "FR"}
            className={`${inputClass} bg-white`}
          >
            {OPERATION_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {dict.operationCountries[c]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {dict.operationCountryHint}
          </p>
        </div>
      )}

      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">
          {dict.bankHeading}
        </legend>
        <p className="mb-3 text-xs text-slate-500">{dict.bankHint}</p>
        {/* US operators store routing / account numbers in the same iban/bic
            columns — only the labels change. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              {isUS ? dict.routingNumber : dict.iban}
            </label>
            <input
              name="iban"
              type="text"
              defaultValue={profile.iban ?? ""}
              placeholder={isUS ? undefined : "FR76 ...."}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              {isUS ? dict.accountNumber : dict.bic}
            </label>
            <input
              name="bic"
              type="text"
              defaultValue={profile.bic ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">{dict.errorGeneric}</p>
          <p className="mt-1 text-xs text-red-600">{state.error}</p>
        </div>
      )}
      {state.saved && !state.error && (
        <p className="text-sm text-emerald-700">{dict.saved}</p>
      )}

      <SubmitButton labels={{ idle: dict.submit, busy: dict.submitting }} />
    </form>
  );
}
