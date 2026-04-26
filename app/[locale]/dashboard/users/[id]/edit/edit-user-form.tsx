"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateUserAction, type UserActionState } from "../../actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Role } from "@/lib/auth/current-user";

const ROLES = ["admin", "owner", "tenant", "service_provider"] as const;

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

export function EditUserForm({
  locale,
  dict,
  rolesDict,
  user,
}: {
  locale: Locale;
  dict: Dictionary["users"];
  rolesDict: Dictionary["roles"];
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: Role;
  };
}) {
  const [state, formAction] = useActionState<UserActionState, FormData>(
    updateUserAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={user.id} />

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.form.email}
        </label>
        <p className="mt-1 text-sm text-slate-500">{user.email ?? "—"}</p>
      </div>

      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-slate-700"
        >
          {dict.form.fullName}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={user.full_name ?? ""}
          placeholder={dict.form.fullNamePlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-700">
          {dict.form.role}
        </label>
        <select
          id="role"
          name="role"
          defaultValue={user.role}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {rolesDict[r]}
            </option>
          ))}
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
