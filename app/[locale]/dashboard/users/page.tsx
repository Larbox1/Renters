import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, type Role } from "@/lib/auth/current-user";

type UserRow = {
  id: string;
  email: string | null;
  role: Role;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  if (session.role !== "admin") {
    return <AccessDenied dict={dict.accessDenied} />;
  }

  const { data, error } = await session.supabase.rpc("admin_list_users");
  if (error) {
    console.error("[users] admin_list_users failed:", error);
  }
  const users = (data ?? []) as UserRow[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
        {dict.users.title}
      </h1>

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
                  {dict.users.columns.lastSignIn}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {dict.users.columns.createdAt}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {dict.roles[u.role]}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
