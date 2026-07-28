import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { currencyForLeaseType, formatCents } from "@/lib/currency";
import { hasContractTemplate } from "@/lib/operation-country";

type StatusTab = "all" | "active" | "pending" | "ended";
const STATUS_TABS: readonly StatusTab[] = ["all", "active", "pending", "ended"];

// "All" tab mixes statuses — keep active leases on top, ended at the bottom.
const STATUS_RANK: Record<string, number> = { active: 0, pending: 1, ended: 2 };

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-sky-100 text-sky-800",
  ended: "bg-slate-100 text-slate-600",
};

// An active lease expiring within this window gets a warning badge.
const ENDING_SOON_DAYS = 60;
const MS_PER_DAY = 86_400_000;

type PropertyRef = { label: string | null; address: string; city: string };
type TenantRef = { full_name: string };

type LeaseRow = {
  id: string;
  status: string;
  type: string | null;
  start_date: string;
  end_date: string | null;
  monthly_rent_cents: number;
  property_id: string;
  properties: PropertyRef | PropertyRef[] | null;
  tenants: TenantRef | TenantRef[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function LeasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string; property?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const leaseDict = dict.leases;
  const listDict = leaseDict.list;

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const sp = await searchParams;
  const tab: StatusTab =
    sp.status === "all" || sp.status === "pending" || sp.status === "ended"
      ? sp.status
      : "active";
  const q = (sp.q ?? "").trim();
  const propertyFilter = (sp.property ?? "").trim();

  const [leasesRes, propertiesRes] = await Promise.all([
    supabase
      .from("leases")
      .select(
        "id, status, type, start_date, end_date, monthly_rent_cents, property_id, properties(label, address, city), tenants(full_name)",
      )
      .order("start_date", { ascending: false }),
    supabase
      .from("properties")
      .select("id, label, address")
      .order("created_at", { ascending: false }),
  ]);

  const allLeases = (leasesRes.data ?? []) as unknown as LeaseRow[];
  const propertyOptions = propertiesRes.data ?? [];

  // Search and property filter apply to every tab; the tab counts reflect them
  // so the numbers always match what clicking a tab would show.
  const needle = q.toLowerCase();
  const searched = allLeases.filter((l) => {
    if (propertyFilter && l.property_id !== propertyFilter) return false;
    if (!needle) return true;
    const p = one(l.properties);
    const t = one(l.tenants);
    return [p?.label, p?.address, p?.city, t?.full_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const counts: Record<StatusTab, number> = {
    all: searched.length,
    active: searched.filter((l) => l.status === "active").length,
    pending: searched.filter((l) => l.status === "pending").length,
    ended: searched.filter((l) => l.status === "ended").length,
  };

  const leases = searched
    .filter((l) => tab === "all" || l.status === tab)
    .sort(
      (a, b) =>
        (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
        b.start_date.localeCompare(a.start_date),
    );

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(iso));

  // Each lease renders in its own currency (a US lease shows $, a FR one €).
  const fmtRent = (l: LeaseRow) =>
    formatCents(
      l.monthly_rent_cents,
      locale as Locale,
      currencyForLeaseType(l.type, session.operationCountry),
    );

  const daysUntilEnd = (l: LeaseRow): number | null => {
    if (l.status !== "active" || !l.end_date) return null;
    const days = Math.ceil(
      (new Date(l.end_date).getTime() - Date.now()) / MS_PER_DAY,
    );
    return days >= 0 && days <= ENDING_SOON_DAYS ? days : null;
  };

  const listPath = `/${locale}/dashboard/leases`;
  const tabHref = (t: StatusTab) => {
    const p = new URLSearchParams();
    if (t !== "active") p.set("status", t);
    if (q) p.set("q", q);
    if (propertyFilter) p.set("property", propertyFilter);
    const s = p.toString();
    return s ? `${listPath}?${s}` : listPath;
  };
  const clearHref = tab !== "active" ? `${listPath}?status=${tab}` : listPath;
  const filtersActive = q !== "" || propertyFilter !== "";

  const statusBadge = (status: string) => (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_BADGE[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {leaseDict.status[status as keyof typeof leaseDict.status] ?? status}
    </span>
  );

  const endingBadge = (l: LeaseRow) => {
    const days = daysUntilEnd(l);
    if (days == null) return null;
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        {days === 0
          ? listDict.endsToday
          : listDict.endsInDays.replace("{days}", String(days))}
      </span>
    );
  };

  const inputClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {leaseDict.title}
        </h1>
        <Link
          href={`/${locale}/dashboard/leases/new`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {leaseDict.newLease}
        </Link>
      </div>

      {allLeases.length === 0 ? (
        <p className="text-sm text-slate-600">{leaseDict.noLeases}</p>
      ) : (
        <>
          {/* Status tabs */}
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

          {/* Search + property filter (GET form, no client JS) */}
          <form method="get" className="mb-6 flex flex-wrap items-center gap-3">
            {tab !== "active" && (
              <input type="hidden" name="status" value={tab} />
            )}
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={listDict.searchPlaceholder}
              className={`${inputClass} w-full sm:w-64`}
            />
            <select
              name="property"
              defaultValue={propertyFilter}
              className={inputClass}
            >
              <option value="">{listDict.allProperties}</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label ?? p.address}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-400 hover:text-brand-700"
            >
              {listDict.apply}
            </button>
            {filtersActive && (
              <Link
                href={clearHref}
                className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
              >
                {listDict.clear}
              </Link>
            )}
          </form>

          {leases.length === 0 ? (
            <p className="text-sm text-slate-600">{listDict.noMatch}</p>
          ) : (
            <>
              {/* Table (sm and up) */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.property}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.tenant}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.type}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.period}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        {listDict.columns.rent}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {listDict.columns.status}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        {listDict.columns.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leases.map((l) => {
                      const p = one(l.properties);
                      const t = one(l.tenants);
                      return (
                        <tr key={l.id} className="align-top hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`${listPath}/${l.id}`}
                              className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                            >
                              {p?.label ?? p?.address ?? "—"}
                            </Link>
                            {p && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {p.address}, {p.city}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {t?.full_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {l.type
                              ? (leaseDict.types[
                                  l.type as keyof typeof leaseDict.types
                                ] ?? l.type)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {fmtDate(l.start_date)}
                            {l.end_date ? ` → ${fmtDate(l.end_date)}` : ""}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {fmtRent(l)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {statusBadge(l.status)}
                              {endingBadge(l)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-3 whitespace-nowrap">
                              <Link
                                href={`${listPath}/${l.id}`}
                                className="text-sm font-medium text-brand-600 hover:underline"
                              >
                                {listDict.view}
                              </Link>
                              <Link
                                href={`${listPath}/${l.id}/edit`}
                                className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
                              >
                                {leaseDict.editLease}
                              </Link>
                              {hasContractTemplate(l.type) && (
                                <Link
                                  href={`${listPath}/${l.id}/contract`}
                                  className="text-sm font-medium text-slate-500 hover:text-brand-700 hover:underline"
                                >
                                  {listDict.contract}
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
                {leases.map((l) => {
                  const p = one(l.properties);
                  const t = one(l.tenants);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`${listPath}/${l.id}`}
                        className="block rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {p?.label ?? p?.address ?? "—"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {t?.full_name ?? "—"} · {fmtDate(l.start_date)}
                              {l.end_date ? ` → ${fmtDate(l.end_date)}` : ""}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-slate-900">
                            {fmtRent(l)}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {statusBadge(l.status)}
                          {endingBadge(l)}
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
