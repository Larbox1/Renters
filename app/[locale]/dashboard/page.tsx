import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { logoutAction } from "@/lib/actions/auth";

type Role = "admin" | "owner" | "tenant" | "service_provider";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) {
    return <SetupNotice locale={locale as Locale} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? "owner") as Role;
  const fullName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "";

  const lastSignIn = user.last_sign_in_at
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(user.last_sign_in_at))
    : dict.dashboard.never;

  const isOwnerOrAdmin = role === "owner" || role === "admin";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {dict.dashboard.title}
          </h1>
          <p className="mt-1 text-slate-600">
            {dict.dashboard.greeting.replace("{name}", fullName)}
          </p>
        </div>

        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {dict.dashboard.logout}
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.dashboard.emailLabel}
          </p>
          <p className="mt-1 text-sm text-slate-900">{user.email}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.dashboard.roleLabel}
          </p>
          <p className="mt-1 text-sm text-slate-900">{dict.roles[role]}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.dashboard.lastSignInLabel}
          </p>
          <p className="mt-1 text-sm text-slate-900">{lastSignIn}</p>
        </div>
      </div>

      {isOwnerOrAdmin ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">
              {dict.dashboard.navCards.properties}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {dict.dashboard.navCards.propertiesDesc}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/tenants`}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">
              {dict.dashboard.navCards.tenants}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {dict.dashboard.navCards.tenantsDesc}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/leases`}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">
              {dict.dashboard.navCards.leases}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {dict.dashboard.navCards.leasesDesc}
            </p>
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">
          {dict.dashboard.placeholder}
        </div>
      )}
    </div>
  );
}
