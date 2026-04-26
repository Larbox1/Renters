import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import {
  getCurrentSession,
  isOwnerOrAdmin,
  type Role,
} from "@/lib/auth/current-user";
import { deleteUserAction, toggleSuspendUserAction } from "./actions";

type UserRow = {
  id: string;
  email: string | null;
  role: Role;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
};

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isSuspended(banned_until: string | null): boolean {
  if (!banned_until) return false;
  return new Date(banned_until).getTime() > Date.now();
}

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }

  const isAdmin = session.role === "admin";

  const { data, error } = await session.supabase.rpc("list_users");
  if (error) {
    console.error("[users] list_users failed:", error);
  }
  const users = (data ?? []) as UserRow[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.users.title}
        </h1>
        {isAdmin && (
          <Link
            href={`/${locale}/dashboard/users/new`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            {dict.users.newUser}
          </Link>
        )}
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.users.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.name}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.email}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.role}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.status}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.lastSignIn}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.createdAt}
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    {dict.users.columns.actions}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const suspended = isSuspended(u.banned_until);
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {dict.roles[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          suspended
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {suspended
                          ? dict.users.status.suspended
                          : dict.users.status.active}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(
                        u.last_sign_in_at,
                        locale as Locale,
                        dict.users.never,
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(u.created_at, locale as Locale, "—")}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${locale}/dashboard/users/${u.id}/edit`}
                            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {dict.users.actions.edit}
                          </Link>
                          <form action={toggleSuspendUserAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="isSuspended"
                              value={String(suspended)}
                            />
                            <button
                              type="submit"
                              onClick={(e) => {
                                const msg = suspended
                                  ? dict.users.confirmUnsuspend
                                  : dict.users.confirmSuspend;
                                if (!confirm(msg)) e.preventDefault();
                              }}
                              className="rounded border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                            >
                              {suspended
                                ? dict.users.actions.unsuspend
                                : dict.users.actions.suspend}
                            </button>
                          </form>
                          <form action={deleteUserAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (!confirm(dict.users.confirmDelete))
                                  e.preventDefault();
                              }}
                              className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              {dict.users.actions.delete}
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
