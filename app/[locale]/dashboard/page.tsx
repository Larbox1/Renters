import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";

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

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const { user, role, fullName } = session;

  const lastSignIn = user.last_sign_in_at
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(user.last_sign_in_at))
    : dict.dashboard.never;

  const showOwnerNav = isOwnerOrAdmin(role);

  // Stats — fetched in parallel. RLS already restricts what each role sees.
  let propertiesCount = 0;
  let occupiedCount = 0;
  let activeLeasesCount = 0;
  let monthlyRentCents = 0;
  let portfolioValueCents = 0;

  if (showOwnerNav) {
    const [propsRes, propsValues, activeLeases] = await Promise.all([
      session.supabase
        .from("properties")
        .select("*", { count: "exact", head: true }),
      session.supabase.from("properties").select("value_cents"),
      session.supabase
        .from("leases")
        .select("monthly_rent_cents, property_id")
        .eq("status", "active"),
    ]);

    propertiesCount = propsRes.count ?? 0;
    portfolioValueCents = (propsValues.data ?? []).reduce(
      (sum, p) => sum + (p.value_cents ?? 0),
      0,
    );
    const leases = activeLeases.data ?? [];
    activeLeasesCount = leases.length;
    monthlyRentCents = leases.reduce(
      (sum, l) => sum + (l.monthly_rent_cents ?? 0),
      0,
    );
    occupiedCount = new Set(leases.map((l) => l.property_id)).size;
  }

  const occupancyPct =
    propertiesCount > 0
      ? Math.round((occupiedCount / propertiesCount) * 100)
      : 0;

  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

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

      {showOwnerNav ? (
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.properties}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {propertiesCount}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/leases`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.activeLeases}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {activeLeasesCount}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.occupancy}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {occupancyPct}%
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {occupiedCount} / {propertiesCount}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/leases`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.monthlyRent}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {fmtCurrency(monthlyRentCents)}
            </p>
          </Link>
          <Link
            href={`/${locale}/dashboard/properties`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {dict.dashboard.stats.portfolioValue}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 group-hover:text-brand-700">
              {fmtCurrency(portfolioValueCents)}
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
