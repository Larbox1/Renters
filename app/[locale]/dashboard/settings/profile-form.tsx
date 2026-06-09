"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
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
}: {
  locale: Locale;
  dict: Dictionary["settings"]["profile"];
  profile: Profile;
  email: string;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    {},
  );

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

      <div>
        <label className={labelClass}>{dict.address}</label>
        <input
          name="address"
          type="text"
          defaultValue={profile.address ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>{dict.city}</label>
          <input
            name="city"
            type="text"
            defaultValue={profile.city ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{dict.postalCode}</label>
          <input
            name="postal_code"
            type="text"
            defaultValue={profile.postal_code ?? ""}
            className={inputClass}
          />
        </div>
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
