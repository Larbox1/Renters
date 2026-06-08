import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import {
  signFirstPhoto,
  type PropertyPhoto,
  type SignedPhoto,
} from "@/lib/properties/photos";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deletePropertyAction } from "./actions";

type View = "cards" | "table";

type PropertyTypeValue =
  | "apartment"
  | "house"
  | "studio"
  | "commercial"
  | "land"
  | "other";

const PROPERTY_TYPES: PropertyTypeValue[] = [
  "apartment",
  "house",
  "studio",
  "commercial",
  "land",
  "other",
];

type StatusFilter = "all" | "for_rent" | "for_sale";
type OccupancyFilter = "all" | "rented" | "vacant";

type Filters = {
  q: string;
  type: PropertyTypeValue | "all";
  status: StatusFilter;
  occupancy: OccupancyFilter;
};

function parseFilters(sp: Record<string, string | undefined>): Filters {
  const type = sp.type as PropertyTypeValue | "all" | undefined;
  const status = sp.status as StatusFilter | undefined;
  const occupancy = sp.occupancy as OccupancyFilter | undefined;
  return {
    q: (sp.q ?? "").trim(),
    type:
      type && (type === "all" || PROPERTY_TYPES.includes(type as PropertyTypeValue))
        ? type
        : "all",
    status:
      status === "for_rent" || status === "for_sale" ? status : "all",
    occupancy:
      occupancy === "rented" || occupancy === "vacant" ? occupancy : "all",
  };
}

function buildQueryString(
  view: View,
  filters: Filters,
  overrides: Partial<{ view: View } & Filters> = {},
): string {
  const merged = { view, ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.view === "table") params.set("view", "table");
  if (merged.q) params.set("q", merged.q);
  if (merged.type !== "all") params.set("type", merged.type);
  if (merged.status !== "all") params.set("status", merged.status);
  if (merged.occupancy !== "all") params.set("occupancy", merged.occupancy);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

type PropertyRow = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  monthly_rent_cents: number | null;
  sell_price_cents: number | null;
  photos: PropertyPhoto[] | null;
  type: PropertyTypeValue | null;
  surface_sqm: number | null;
  rooms: number | null;
  bedrooms: number | null;
  parking: boolean;
  basement: boolean;
  to_rent: boolean;
  to_sell: boolean;
};

export default async function PropertiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    view?: string;
    q?: string;
    type?: string;
    status?: string;
    occupancy?: string;
  }>;
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
  const { supabase } = session;

  const sp = await searchParams;
  const view: View = sp.view === "table" ? "table" : "cards";
  const filters = parseFilters(sp);

  // Build the filtered list query.
  let listQuery = supabase
    .from("properties")
    .select(
      "id, label, address, city, postal_code, monthly_rent_cents, sell_price_cents, photos, type, surface_sqm, rooms, bedrooms, parking, basement, to_rent, to_sell",
    )
    .order("created_at", { ascending: false });

  if (filters.type !== "all") listQuery = listQuery.eq("type", filters.type);
  if (filters.status === "for_rent") listQuery = listQuery.eq("to_rent", true);
  if (filters.status === "for_sale") listQuery = listQuery.eq("to_sell", true);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_,]/g, (c) => `\\${c}`);
    listQuery = listQuery.or(
      `label.ilike.%${escaped}%,address.ilike.%${escaped}%,city.ilike.%${escaped}%`,
    );
  }

  // Run the list query alongside the lightweight stats queries.
  const [listRes, valuesRes, activeLeasesRes, totalCountRes] = await Promise.all([
    listQuery,
    supabase.from("properties").select("value_cents"),
    supabase
      .from("leases")
      .select("monthly_rent_cents, property_id")
      .eq("status", "active"),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true }),
  ]);

  const activeLeases = activeLeasesRes.data ?? [];
  const rentedSet = new Set(activeLeases.map((l) => l.property_id));

  let properties = (listRes.data ?? []) as PropertyRow[];
  if (filters.occupancy === "rented") {
    properties = properties.filter((p) => rentedSet.has(p.id));
  } else if (filters.occupancy === "vacant") {
    properties = properties.filter((p) => !rentedSet.has(p.id));
  }

  const propertiesCount = totalCountRes.count ?? 0;
  const shownCount = properties.length;
  const filtersActive =
    filters.q !== "" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.occupancy !== "all";
  const portfolioValueCents = (valuesRes.data ?? []).reduce(
    (s, p) => s + (p.value_cents ?? 0),
    0,
  );
  const monthlyRentCents = activeLeases.reduce(
    (s, l) => s + (l.monthly_rent_cents ?? 0),
    0,
  );
  const rentedCount = rentedSet.size;

  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  // Sign only the first photo per property — we just need a thumbnail.
  const photoCovers: Map<string, SignedPhoto> = new Map();
  await Promise.all(
    properties.map(async (p) => {
      const cover = await signFirstPhoto((p.photos ?? []) as PropertyPhoto[]);
      if (cover) photoCovers.set(p.id, cover);
    }),
  );

  return (
    <div className="px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.properties.title}
        </h1>
        <div className="flex items-center gap-3">
          <ViewToggle
            locale={locale as Locale}
            view={view}
            filters={filters}
            dict={dict.properties}
          />
          <Link
            href={`/${locale}/dashboard/properties/new`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            {dict.properties.newProperty}
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.dashboard.stats.properties}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {propertiesCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.dashboard.stats.portfolioValue}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {fmtCurrency(portfolioValueCents)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.dashboard.stats.monthlyRent}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {fmtCurrency(monthlyRentCents)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {dict.properties.rentedStat}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {rentedCount}
            <span className="ml-1 text-sm font-normal text-slate-500">
              / {propertiesCount}
            </span>
          </p>
        </div>
      </div>

      {propertiesCount > 0 && (
        <FilterBar
          locale={locale as Locale}
          view={view}
          filters={filters}
          filtersActive={filtersActive}
          shownCount={shownCount}
          totalCount={propertiesCount}
          dict={dict.properties}
        />
      )}

      {propertiesCount === 0 ? (
        <p className="text-sm text-slate-600">{dict.properties.noProperties}</p>
      ) : properties.length === 0 ? (
        <p className="text-sm text-slate-600">
          {dict.properties.filters.noMatches}
        </p>
      ) : view === "table" ? (
        <TableView
          locale={locale as Locale}
          properties={properties}
          dict={dict.properties}
          fmtCurrency={fmtCurrency}
        />
      ) : (
        <CardsView
          locale={locale as Locale}
          properties={properties}
          photoCovers={photoCovers}
          dict={dict.properties}
          fmtCurrency={fmtCurrency}
        />
      )}
    </div>
  );
}

function ViewToggle({
  locale,
  view,
  filters,
  dict,
}: {
  locale: Locale;
  view: View;
  filters: Filters;
  dict: Dictionary["properties"];
}) {
  const base =
    "inline-flex items-center px-3 py-1.5 text-xs font-semibold transition";
  const cardsHref = `/${locale}/dashboard/properties${buildQueryString(view, filters, { view: "cards" })}`;
  const tableHref = `/${locale}/dashboard/properties${buildQueryString(view, filters, { view: "table" })}`;
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
      <Link
        href={cardsHref}
        className={`${base} ${
          view === "cards"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {dict.viewCards}
      </Link>
      <Link
        href={tableHref}
        className={`${base} border-l border-slate-300 ${
          view === "table"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {dict.viewTable}
      </Link>
    </div>
  );
}

function FilterBar({
  locale,
  view,
  filters,
  filtersActive,
  shownCount,
  totalCount,
  dict,
}: {
  locale: Locale;
  view: View;
  filters: Filters;
  filtersActive: boolean;
  shownCount: number;
  totalCount: number;
  dict: Dictionary["properties"];
}) {
  const f = dict.filters;
  return (
    <form
      action={`/${locale}/dashboard/properties`}
      method="get"
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {view === "table" && <input type="hidden" name="view" value="table" />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-600">
            {f.search}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={f.searchPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600">
            {f.type}
          </span>
          <select
            name="type"
            defaultValue={filters.type}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">{f.anyType}</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {dict.types[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600">
            {f.status}
          </span>
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">{f.anyStatus}</option>
            <option value="for_rent">{f.forRent}</option>
            <option value="for_sale">{f.forSale}</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600">
            {f.occupancy}
          </span>
          <select
            name="occupancy"
            defaultValue={filters.occupancy}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">{f.anyOccupancy}</option>
            <option value="rented">{f.rented}</option>
            <option value="vacant">{f.vacant}</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {f.resultCount
            .replace("{shown}", String(shownCount))
            .replace("{total}", String(totalCount))}
        </p>
        <div className="flex items-center gap-2">
          {filtersActive && (
            <Link
              href={`/${locale}/dashboard/properties${view === "table" ? "?view=table" : ""}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {f.reset}
            </Link>
          )}
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            {f.apply}
          </button>
        </div>
      </div>
    </form>
  );
}

function CardsView({
  locale,
  properties,
  photoCovers,
  dict,
  fmtCurrency,
}: {
  locale: Locale;
  properties: PropertyRow[];
  photoCovers: Map<string, SignedPhoto>;
  dict: Dictionary["properties"];
  fmtCurrency: (cents: number) => string;
}) {
  return (
    <ul className="flex flex-wrap gap-4">
      {properties.map((p) => {
        const cover = photoCovers.get(p.id);
        const specs: string[] = [];
        if (p.type) specs.push(dict.types[p.type]);
        if (p.surface_sqm != null) specs.push(`${p.surface_sqm} m²`);
        if (p.rooms != null)
          specs.push(`${p.rooms} ${dict.fields.rooms.toLowerCase()}`);
        if (p.bedrooms != null)
          specs.push(
            `${p.bedrooms} ${dict.fields.bedrooms.toLowerCase()}`,
          );
        const amenities: string[] = [];
        if (p.parking) amenities.push(`🅿 ${dict.fields.parking}`);
        if (p.basement) amenities.push(`📦 ${dict.fields.basement}`);

        return (
          <li key={p.id} className="w-full sm:w-[350px]">
            <Link
              href={`/${locale}/dashboard/properties/${p.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
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
                {/* Status badges over the photo */}
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  {p.to_rent && (
                    <span className="inline-block rounded-full bg-emerald-100/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 backdrop-blur">
                      {dict.fields.forRentBadge}
                    </span>
                  )}
                  {p.to_sell && (
                    <span className="inline-block rounded-full bg-amber-100/90 px-2 py-0.5 text-[11px] font-semibold text-amber-800 backdrop-blur">
                      {dict.fields.forSaleBadge}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="font-semibold text-slate-900 group-hover:text-brand-700">
                  {p.label ?? `${p.address}, ${p.city}`}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {p.address}, {p.city}
                  {p.postal_code ? ` ${p.postal_code}` : ""}
                </p>

                {specs.length > 0 && (
                  <p className="mt-2 text-xs text-slate-600">
                    {specs.join(" · ")}
                  </p>
                )}
                {amenities.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {amenities.join(" · ")}
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 pt-3 text-sm">
                  {p.monthly_rent_cents != null && p.to_rent && (
                    <p className="font-semibold text-slate-900">
                      {fmtCurrency(p.monthly_rent_cents)}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        /mo
                      </span>
                    </p>
                  )}
                  {p.sell_price_cents != null && p.to_sell && (
                    <p className="text-right text-sm font-semibold text-amber-700">
                      {fmtCurrency(p.sell_price_cents)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TableView({
  locale,
  properties,
  dict,
  fmtCurrency,
}: {
  locale: Locale;
  properties: PropertyRow[];
  dict: Dictionary["properties"];
  fmtCurrency: (cents: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              {dict.fields.label.replace(/\s*\(.*\)\s*$/, "")}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              {dict.fields.type}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              {dict.fields.surface}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              {dict.fields.rooms} / {dict.fields.bedrooms}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              {dict.fields.city}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              Status
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">
              {dict.fields.monthlyRent.replace(/\s*\(.*\)\s*$/, "")}
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">
              {dict.actions.label}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {properties.map((p) => {
            const amenities: string[] = [];
            if (p.parking) amenities.push("🅿");
            if (p.basement) amenities.push("📦");

            return (
              <tr key={p.id} className="hover:bg-slate-50 align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/${locale}/dashboard/properties/${p.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                  >
                    {p.label ?? p.address}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.address}
                    {p.postal_code ? `, ${p.postal_code}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {p.type ? dict.types[p.type] : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {p.surface_sqm != null ? `${p.surface_sqm} m²` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {p.rooms ?? "—"} / {p.bedrooms ?? "—"}
                  {amenities.length > 0 && (
                    <span className="ml-2 text-xs text-slate-500">
                      {amenities.join(" ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{p.city}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.to_rent && (
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        {dict.fields.forRentBadge}
                      </span>
                    )}
                    {p.to_sell && (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        {dict.fields.forSaleBadge}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.monthly_rent_cents != null && (
                    <p className="font-medium text-slate-700">
                      {fmtCurrency(p.monthly_rent_cents)}
                    </p>
                  )}
                  {p.sell_price_cents != null && p.to_sell && (
                    <p className="text-xs font-medium text-amber-700">
                      {fmtCurrency(p.sell_price_cents)}
                    </p>
                  )}
                  {p.monthly_rent_cents == null &&
                    !(p.sell_price_cents != null && p.to_sell) &&
                    "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/${locale}/dashboard/properties/${p.id}/edit`}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {dict.actions.edit}
                    </Link>
                    <form action={deletePropertyAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmit
                        message={dict.confirmDelete}
                        className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        {dict.actions.delete}
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
