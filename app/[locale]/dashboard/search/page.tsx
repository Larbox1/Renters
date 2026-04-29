import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentSession } from "@/lib/auth/current-user";

type PropertyHit = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  monthly_rent_cents: number | null;
};

type TenantHit = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type LeaseHit = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent_cents: number;
  property_id: string;
  tenant_id: string;
  properties:
    | { label: string | null; address: string; city: string }
    | { label: string | null; address: string; city: string }[]
    | null;
  tenants:
    | { full_name: string }
    | { full_name: string }[]
    | null;
};

// PostgREST .or() splits on commas/parens — strip those out so we don't
// break the filter syntax. Also strip the wildcard chars * and % so the
// caller can't accidentally inject them.
function sanitizeOrTerm(raw: string): string {
  return raw.replace(/[,()*%]/g, "").trim();
}

const PER_SECTION = 20;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  let properties: PropertyHit[] = [];
  let tenants: TenantHit[] = [];
  let leases: LeaseHit[] = [];

  let propsError: string | null = null;
  let tenantsError: string | null = null;
  let leasesError: string | null = null;

  if (q.length > 0) {
    const safe = sanitizeOrTerm(q);

    if (safe.length > 0) {
      // PostgREST treats `*` as the SQL `%` wildcard inside .or() filters.
      // Using `*` avoids URL-encoding ambiguity around the `%` character.
      const propsFilter = [
        "label",
        "address",
        "city",
        "postal_code",
        "country",
        "description",
      ]
        .map((col) => `${col}.ilike.*${safe}*`)
        .join(",");

      const tenantsFilter = ["full_name", "email", "phone", "notes"]
        .map((col) => `${col}.ilike.*${safe}*`)
        .join(",");

      const [propsRes, tenantsRes] = await Promise.all([
        session.supabase
          .from("properties")
          .select(
            "id, label, address, city, postal_code, monthly_rent_cents",
          )
          .or(propsFilter)
          .limit(PER_SECTION),
        session.supabase
          .from("tenants")
          .select("id, full_name, email, phone")
          .or(tenantsFilter)
          .limit(PER_SECTION),
      ]);

      if (propsRes.error) {
        console.error("[search.properties]", propsRes.error);
        propsError = propsRes.error.message;
      }
      if (tenantsRes.error) {
        console.error("[search.tenants]", tenantsRes.error);
        tenantsError = tenantsRes.error.message;
      }

      properties = (propsRes.data ?? []) as PropertyHit[];
      tenants = (tenantsRes.data ?? []) as TenantHit[];

      // Find leases connected to any matched property OR tenant.
      const propertyIds = properties.map((p) => p.id);
      const tenantIds = tenants.map((t) => t.id);

      if (propertyIds.length || tenantIds.length) {
        const filters: string[] = [];
        if (propertyIds.length) {
          filters.push(`property_id.in.(${propertyIds.join(",")})`);
        }
        if (tenantIds.length) {
          filters.push(`tenant_id.in.(${tenantIds.join(",")})`);
        }
        const { data: leasesData, error: leasesErr } = await session.supabase
          .from("leases")
          .select(
            "id, status, start_date, end_date, monthly_rent_cents, property_id, tenant_id, properties(label, address, city), tenants(full_name)",
          )
          .or(filters.join(","))
          .order("start_date", { ascending: false })
          .limit(PER_SECTION);
        if (leasesErr) {
          console.error("[search.leases]", leasesErr);
          leasesError = leasesErr.message;
        }
        leases = (leasesData ?? []) as LeaseHit[];
      }
    }
  }

  const anyError = propsError || tenantsError || leasesError;

  const totalHits = properties.length + tenants.length + leases.length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
        {dict.search.title}
      </h1>
      {q.length > 0 && (
        <p className="mb-6 text-sm text-slate-600">
          {dict.search.heading.replace("{q}", q)}
        </p>
      )}

      {/* Inline search box for refining the query without going back to the navbar */}
      <form
        action={`/${locale}/dashboard/search`}
        method="get"
        className="mb-8 flex gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={dict.nav.searchPlaceholder}
          className="block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          {dict.search.title}
        </button>
      </form>

      {anyError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Search failed</p>
          {propsError && (
            <p className="mt-1 text-xs">Properties: {propsError}</p>
          )}
          {tenantsError && (
            <p className="mt-1 text-xs">Tenants: {tenantsError}</p>
          )}
          {leasesError && (
            <p className="mt-1 text-xs">Leases: {leasesError}</p>
          )}
        </div>
      )}

      {q.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.search.emptyQuery}</p>
      ) : totalHits === 0 ? (
        <p className="text-sm text-slate-600">{dict.search.empty}</p>
      ) : (
        <div className="space-y-8">
          {properties.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {dict.search.sections.properties} · {properties.length}
              </h2>
              <ul className="grid gap-2">
                {properties.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/${locale}/dashboard/properties/${p.id}`}
                      className="block rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <p className="font-medium text-slate-900">
                        {p.label ?? `${p.address}, ${p.city}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {p.address}, {p.city}
                        {p.postal_code ? ` ${p.postal_code}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tenants.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {dict.search.sections.tenants} · {tenants.length}
              </h2>
              <ul className="grid gap-2">
                {tenants.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/${locale}/dashboard/tenants/${t.id}`}
                      className="block rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <p className="font-medium text-slate-900">
                        {t.full_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {[t.email, t.phone].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {leases.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {dict.search.sections.leases} · {leases.length}
              </h2>
              <ul className="grid gap-2">
                {leases.map((l) => {
                  const property = Array.isArray(l.properties)
                    ? l.properties[0]
                    : l.properties;
                  const tenant = Array.isArray(l.tenants)
                    ? l.tenants[0]
                    : l.tenants;
                  const propLabel = property
                    ? (property.label ??
                      `${property.address}, ${property.city}`)
                    : "—";
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/${locale}/dashboard/leases/${l.id}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {propLabel}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {tenant?.full_name ?? "—"} · {l.start_date}
                            {l.end_date ? ` → ${l.end_date}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {l.status}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
