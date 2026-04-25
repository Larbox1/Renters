"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signupAction, type SignupState } from "./actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

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

export function SignupForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary["auth"]["signup"];
}) {
  const [state, formAction] = useActionState<SignupState, FormData>(
    signupAction,
    { status: "idle" },
  );

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-green-900">
          {dict.emailSent}
        </h2>
        <p className="mt-2 text-sm text-green-800">
          {dict.emailSentBody.replace("{email}", state.email ?? "")}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-slate-700"
        >
          {dict.fullName}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          {dict.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          {dict.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-slate-500">{dict.passwordHint}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          {dict.role}
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(["owner", "tenant", "service_provider"] as const).map(
            (roleValue, idx) => (
              <label
                key={roleValue}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-brand-500 has-[input:checked]:border-brand-600 has-[input:checked]:bg-brand-50 has-[input:checked]:text-brand-900"
              >
                <input
                  type="radio"
                  name="role"
                  value={roleValue}
                  defaultChecked={idx === 0}
                  className="text-brand-600 focus:ring-brand-500"
                />
                {dict.roles[roleValue]}
              </label>
            ),
          )}
        </div>
      </fieldset>

      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">{dict.errorGeneric}</p>
          {state.error && (
            <p className="mt-1 text-xs text-red-600">{state.error}</p>
          )}
        </div>
      )}

      <SubmitButton labels={{ idle: dict.submit, busy: dict.submitting }} />

      <p className="text-center text-sm text-slate-600">
        {dict.haveAccount}{" "}
        <Link
          href={`/${locale}/login`}
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          {dict.loginLink}
        </Link>
      </p>
    </form>
  );
}
