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
  searchParams: Promise<{ view?: string }>;
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

  // Run the list query alongside the lightweight stats queries.
  const [listRes, valuesRes, activeLeasesRes] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, label, address, city, postal_code, monthly_rent_cents, sell_price_cents, photos, type, surface_sqm, rooms, bedrooms, parking, basement, to_rent, to_sell",
      )
      .order("created_at", { ascending: false }),
    supabase.from("properties").select("value_cents"),
    supabase
      .from("leases")
      .select("monthly_rent_cents, property_id")
      .eq("status", "active"),
  ]);

  const properties = (listRes.data ?? []) as PropertyRow[];
  const propertiesCount = properties.length;
  const portfolioValueCents = (valuesRes.data ?? []).reduce(
    (s, p) => s + (p.value_cents ?? 0),
    0,
  );
  const activeLeases = activeLeasesRes.data ?? [];
  const monthlyRentCents = activeLeases.reduce(
    (s, l) => s + (l.monthly_rent_cents ?? 0),
    0,
  );
  const rentedCount = new Set(activeLeases.map((l) => l.property_id)).size;

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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {dict.properties.title}
        </h1>
        <div className="flex items-center gap-3">
          <ViewToggle locale={locale as Locale} view={view} dict={dict.properties} />
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

      {properties.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.properties.noProperties}</p>
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
  dict,
}: {
  locale: Locale;
  view: View;
  dict: Dictionary["properties"];
}) {
  const base =
    "inline-flex items-center px-3 py-1.5 text-xs font-semibold transition";
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
      <Link
        href={`/${locale}/dashboard/properties?view=cards`}
        className={`${base} ${
          view === "cards"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {dict.viewCards}
      </Link>
      <Link
        href={`/${locale}/dashboard/properties?view=table`}
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
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <li key={p.id}>
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
