import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession } from "@/lib/auth/current-user";
import {
  signFirstPhoto,
  type PropertyPhoto,
  type SignedPhoto,
} from "@/lib/properties/photos";

type ListedProperty = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  country: string | null;
  monthly_rent_cents: number | null;
  value_cents: number | null;
  sell_price_cents: number;
  photos: PropertyPhoto[] | null;
};

type SearchParams = {
  q?: string;
  city?: string;
  min?: string;
  max?: string;
};

function parsePriceEurosToCents(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

// PostgREST .or() splits on commas/parens — strip those out of user input
// so we don't break the filter syntax.
function sanitizeOrTerm(raw: string): string {
  return raw.replace(/[,()]/g, "");
}

export default async function TheHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
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

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const city = (sp.city ?? "").trim();
  const minCents = parsePriceEurosToCents(sp.min);
  const maxCents = parsePriceEurosToCents(sp.max);

  let query = session.supabase
    .from("properties")
    .select(
      "id, label, address, city, postal_code, country, monthly_rent_cents, value_cents, sell_price_cents, photos",
    )
    .not("sell_price_cents", "is", null)
    .order("sell_price_cents", { ascending: true });

  if (q) {
    const safe = sanitizeOrTerm(q);
    query = query.or(
      `address.ilike.%${safe}%,city.ilike.%${safe}%,label.ilike.%${safe}%,postal_code.ilike.%${safe}%`,
    );
  }
  if (city) query = query.ilike("city", `%${city}%`);
  if (minCents !== null) query = query.gte("sell_price_cents", minCents);
  if (maxCents !== null) query = query.lte("sell_price_cents", maxCents);

  const { data, error } = await query;
  if (error) console.error("[the-hub] query failed:", error);
  const properties = (data ?? []) as ListedProperty[];

  const photoCovers = new Map<string, SignedPhoto>();
  await Promise.all(
    properties.map(async (p) => {
      const cover = await signFirstPhoto((p.photos ?? []) as PropertyPhoto[]);
      if (cover) photoCovers.set(p.id, cover);
    }),
  );

  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const hasFilters = Boolean(q || city || minCents !== null || maxCents !== null);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          The Hub
        </h1>
      </div>
      <p className="mb-6 text-sm text-slate-600">
        Properties listed for sale across all owners.
      </p>

      {/* Filters — submits via GET so the URL holds state and the page
          re-renders server-side with the new filters. */}
      <form
        method="get"
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-12"
      >
        <div className="sm:col-span-6">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Address, city, label…"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            City
          </label>
          <input
            type="text"
            name="city"
            defaultValue={city}
            placeholder="Paris"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Min price (€)
          </label>
          <input
            type="number"
            name="min"
            defaultValue={sp.min ?? ""}
            min="0"
            step="1000"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Max price (€)
          </label>
          <input
            type="number"
            name="max"
            defaultValue={sp.max ?? ""}
            min="0"
            step="1000"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-9 sm:justify-end">
          {hasFilters && (
            <Link
              href={`/${locale}/dashboard/the-hub`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Apply
          </button>
        </div>
      </form>

      {properties.length === 0 ? (
        <p className="text-sm text-slate-600">
          {hasFilters
            ? "No properties match your filters."
            : "No properties for sale yet."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {properties.length} result{properties.length === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => {
              const cover = photoCovers.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/${locale}/dashboard/properties/${p.id}`}
                    className="group block h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-md"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {cover?.signedUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cover.signedUrl}
                          alt={cover.name}
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">
                          🏠
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-2xl font-bold text-slate-900">
                        {fmtCurrency(p.sell_price_cents)}
                      </p>
                      <p className="mt-2 font-medium text-slate-900">
                        {p.label ?? `${p.address}, ${p.city}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {p.address}, {p.city}
                        {p.postal_code ? ` ${p.postal_code}` : ""}
                        {p.country ? `, ${p.country}` : ""}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        {p.monthly_rent_cents != null && (
                          <span>
                            Rent:{" "}
                            <span className="font-medium text-slate-700">
                              {fmtCurrency(p.monthly_rent_cents)}/mo
                            </span>
                          </span>
                        )}
                        {p.value_cents != null && (
                          <span>
                            Value:{" "}
                            <span className="font-medium text-slate-700">
                              {fmtCurrency(p.value_cents)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
