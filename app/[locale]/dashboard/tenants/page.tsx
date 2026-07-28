import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { currencyForLeaseType, formatCents } from "@/lib/currency";

type StatusTab = "all" | "active" | "none";
const STATUS_TABS: readonly StatusTab[] = ["all", "active", "none"];

// A tenant's "best" lease decides their status: an active lease wins over a
// pending one, which wins over an ended one.
const LEASE_RANK: Record<string, number> = { active: 0, pending: 1, ended: 2 };

const LEASE_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-sky-100 text-sky-800",
  ended: "bg-slate-100 text-slate-600",
};

type PropertyRef = { label: string | null; address: string };

type LeaseRow = {
  tenant_id: string;
  status: string;
  type: string | null;
  monthly_rent_cents: number;
  property_id: string;
  properties: PropertyRef | PropertyRef[] | null;
};

type TenantRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  tenant_type: string | null;
  auth_user_id: string | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function TenantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const tenantDict = dict.tenants;
  const listDict = tenantDict.list;

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const sp = await searchParams;
  const tab: StatusTab =
    sp.status === "active" || sp.status === "none" ? sp.status : "all";
  const q = (sp.q ?? "").trim();

  const [tenantsRes, leasesRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, full_name, email, phone, tenant_type, auth_user_id")
      .order("full_name", { ascending: true }),
    supabase
      .from("leases")
      .select(
        "tenant_id, status, type, monthly_rent_cents, property_id, properties(label, address)",
      )
      .order("start_date", { ascending: false }),
  ]);

  const allTenants = (tenantsRes.data ?? []) as TenantRow[];
  const allLeases = (leasesRes.data ?? []) as unknown as LeaseRow[];

  // Most relevant lease per tenant (leases arrive newest-first, so ties keep
  // the most recent one).
  const bestLease = new Map<string, LeaseRow>();
  for (const l of allLeases) {
    const current = bestLease.get(l.tenant_id);
    if (
      !current ||
      (LEASE_RANK[l.status] ?? 9) < (LEASE_RANK[current.status] ?? 9)
    ) {
      bestLease.set(l.tenant_id, l);
    }
  }

  // Search applies to every tab; tab counts reflect it so the numbers always
  // match what clicking a tab would show.
  const needle = q.toLowerCase();
  const searched = allTenants.filter((t) => {
    if (!needle) return true;
    const lease = bestLease.get(t.id);
    const p = lease ? one(lease.properties) : null;
    return [t.full_name, t.email, t.phone, p?.label, p?.address]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const hasActiveLease = (t: TenantRow) =>
    bestLease.get(t.id)?.status === "active";

  const counts: Record<StatusTab, number> = {
    all: searched.length,
    active: searched.filter(hasActiveLease).length,
    none: searched.filter((t) => !hasActiveLease(t)).length,
  };

  const tenants = searched.filter((t) =>
    tab === "all" ? true : tab === "active" ? hasActiveLease(t) : !hasActiveLease(t),
  );

  // Each rent renders in its lease's currency (a US lease shows $, a FR one €).
  const fmtRent = (l: LeaseRow) =>
    formatCents(
      l.monthly_rent_cents,
      locale as Locale,
      currencyForLeaseType(l.type, session.operationCountry),
    );

  const listPath = `/${locale}/dashboard/tenants`;
  const tabHref = (t: StatusTab) => {
    const p = new URLSearchParams();
    if (t !== "all") p.set("status", t);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `${listPath}?${s}` : listPath;
  };
  const clearHref = tab !== "all" ? `${listPath}?status=${tab}` : listPath;

  const companyTag = (t: TenantRow) =>
    t.tenant_type === "societe" ? (
      <span className="ml-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        {listDict.company}
      </span>
    ) : null;

  const leaseBadge = (t: TenantRow) => {
    const lease = bestLease.get(t.id);
    if (!lease) {
      return (
        <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {listDict.leaseNone}
        </span>
      );
    }
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
          LEASE_BADGE[lease.status] ?? "bg-slate-100 text-slate-700"
        }`}
      >
        {dict.leases.status[lease.status as keyof typeof dict.leases.status] ??
          lease.status}
      </span>
    );
  };

  const accountBadge = (t: TenantRow) =>
    t.auth_user_id ? (
      <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
        {listDict.hasAccount}
      </span>
    ) : (
      <span className="text-slate-400">—</span>
    );

  const inputClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {tenantDict.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/tenants/new`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {tenantDict.newTenant}
        </Link>
      </div>

      {allTenants.length === 0 ? (
        <p className="text-sm text-slate-600">{tenantDict.noTenants}</p>
      ) : (
        <>
          {/* Lease-status tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <Link
                key={t}
                href={tabHref(t)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  t === tab
                    ? "bg-brand-600 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-700"
                }`}
              >
                {listDict.tabs[t]}
                <span
                  className={`ml-1.5 text-xs ${
                    t === tab ? "text-brand-100" : "text-slate-400"
                  }`}
                >
                  {counts[t]}
                </span>
              </Link>
            ))}
          </div>

          {/* Search (GET form, no client JS) */}
          <form method="get" className="mb-6 flex flex-wrap items-center gap-3">
            {tab !== "all" && <input type="hidden" name="status" value={tab} />}
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={listDict.searchPlaceholder}
              className={`${inputClass} w-full sm:w-72`}
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-400 hover:text-brand-700"
            >
              {listDict.apply}
            </button>
            {q !== "" && (
              <Link
                href={clearHref}
                className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
              >
                {listDict.clear}
              </Link>
            )}
          </form>

          {tenants.length === 0 ? (
            <p className="text-sm text-slate-600">{listDict.noMatch}</p>
          ) : (
            <>
              {/* Table (sm and up) */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.name}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.contact}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.property}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.lease}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.account}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        {listDict.columns.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.map((t) => {
                      const lease = bestLease.get(t.id);
                      const p = lease ? one(lease.properties) : null;
                      return (
                        <tr key={t.id} className="align-top hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`${listPath}/${t.id}`}
                              className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                            >
                              {t.full_name}
                            </Link>
                            {companyTag(t)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {t.email || t.phone ? (
                              <>
                                {t.email && <p>{t.email}</p>}
                                {t.phone && (
                                  <p className="text-xs text-slate-500">
                                    {t.phone}
                                  </p>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lease && p ? (
                              <Link
                                href={`/${locale}/dashboard/properties/${lease.property_id}`}
                                className="text-slate-700 hover:text-brand-700 hover:underline"
                              >
                                {p.label ?? p.address}
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {leaseBadge(t)}
                            {lease?.status === "active" && (
                              <p className="mt-1 text-xs text-slate-500">
                                {fmtRent(lease)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">{accountBadge(t)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-3 whitespace-nowrap">
                              <Link
                                href={`${listPath}/${t.id}`}
                                className="text-sm font-medium text-brand-600 hover:underline"
                              >
                                {dict.leases.list.view}
                              </Link>
                              <Link
                                href={`${listPath}/${t.id}/edit`}
                                className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
                              >
                                {tenantDict.editTenant}
                              </Link>
                              {!hasActiveLease(t) && (
                                <Link
                                  href={`/${locale}/dashboard/leases/new?tenant_id=${t.id}`}
                                  className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
                                >
                                  {dict.leases.newLease}
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Stacked rows (mobile) */}
              <ul className="space-y-3 sm:hidden">
                {tenants.map((t) => {
                  const lease = bestLease.get(t.id);
                  const p = lease ? one(lease.properties) : null;
                  return (
                    <li key={t.id}>
                      <Link
                        href={`${listPath}/${t.id}`}
                        className="block rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {t.full_name}
                              {companyTag(t)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {t.email ?? t.phone ?? "—"}
                            </p>
                            {lease && p && (
                              <p className="text-sm text-slate-500">
                                {p.label ?? p.address}
                              </p>
                            )}
                          </div>
                          {lease?.status === "active" && (
                            <p className="text-sm font-medium text-slate-900">
                              {fmtRent(lease)}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {leaseBadge(t)}
                          {t.auth_user_id && accountBadge(t)}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
