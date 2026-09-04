"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeOnboardingAction,
  signOutAction,
  type OnboardingRole,
  type OnboardingState,
} from "./actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  OPERATION_COUNTRIES,
  type OperationCountry,
} from "@/lib/operation-country";

function SubmitButton({ labels }: { labels: { idle: string; busy: string } }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? labels.busy : labels.idle}
    </button>
  );
}

const OPTION_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-brand-500 has-[input:checked]:border-brand-600 has-[input:checked]:bg-brand-50 has-[input:checked]:text-brand-900";

export function OnboardingForm({
  locale,
  dict,
  signupDict,
}: {
  locale: Locale;
  dict: Dictionary["auth"]["onboarding"];
  signupDict: Dictionary["auth"]["signup"];
}) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboardingAction,
    { status: "idle" },
  );
  const [role, setRole] = useState<OnboardingRole>("owner");
  const [operationCountry, setOperationCountry] =
    useState<OperationCountry>("FR");

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">
            {dict.role}
          </legend>
          {/* service_provider is hidden from signup for now — the role still
              exists and can be granted by an admin. */}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(["owner", "tenant"] as const).map((roleValue) => (
              <label key={roleValue} className={OPTION_CLASS}>
                <input
                  type="radio"
                  name="role"
                  value={roleValue}
                  checked={role === roleValue}
                  onChange={() => setRole(roleValue)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                {signupDict.roles[roleValue]}
              </label>
            ))}
          </div>
        </fieldset>

        {role === "owner" && (
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              {signupDict.operationCountry}
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              {signupDict.operationCountryHint}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {OPERATION_COUNTRIES.map((countryValue) => (
                <label key={countryValue} className={OPTION_CLASS}>
                  <input
                    type="radio"
                    name="operation_country"
                    value={countryValue}
                    checked={operationCountry === countryValue}
                    onChange={() => setOperationCountry(countryValue)}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  {signupDict.operationCountries[countryValue]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {state.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p className="font-medium">{dict.errorGeneric}</p>
            {state.error && (
              <p className="mt-1 text-xs text-red-600">{state.error}</p>
            )}
          </div>
        )}

        <SubmitButton labels={{ idle: dict.submit, busy: dict.submitting }} />
      </form>

      <form action={signOutAction} className="text-center">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          {dict.signOut}
        </button>
      </form>
    </div>
  );
}
