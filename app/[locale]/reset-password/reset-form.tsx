"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction, type ResetPasswordState } from "./actions";
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

export function ResetForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary["auth"]["resetPassword"];
}) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    { status: "idle" },
  );

  const errorText =
    state.status === "error"
      ? state.error === "password_mismatch"
        ? dict.mismatch
        : state.error === "password_too_short"
          ? dict.passwordHint
          : dict.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

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

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-700"
        >
          {dict.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {errorText && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorText}
        </div>
      )}

      <SubmitButton labels={{ idle: dict.submit, busy: dict.submitting }} />
    </form>
  );
}
