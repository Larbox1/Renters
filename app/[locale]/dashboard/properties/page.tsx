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

type View = "cards" | "table";

type PropertyRow = {
  id: string;
  label: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  monthly_rent_cents: number | null;
  photos: PropertyPhoto[] | null;
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

  const { data } = await supabase
    .from("properties")
    .select("id, label, address, city, postal_code, monthly_rent_cents, photos")
    .order("created_at", { ascending: false });

  const properties = (data ?? []) as PropertyRow[];

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

      {properties.length === 0 ? (
        <p className="text-sm text-slate-600">{dict.properties.noProperties}</p>
      ) : view === "table" ? (
        <TableView locale={locale as Locale} properties={properties} />
      ) : (
        <CardsView
          locale={locale as Locale}
          properties={properties}
          photoCovers={photoCovers}
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
}: {
  locale: Locale;
  properties: PropertyRow[];
  photoCovers: Map<string, SignedPhoto>;
}) {
  return (
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
              <div className="p-4">
                <p className="font-medium text-slate-900">
                  {p.label ?? `${p.address}, ${p.city}`}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {p.address}, {p.city}
                  {p.postal_code ? ` ${p.postal_code}` : ""}
                </p>
                {p.monthly_rent_cents != null && (
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {(p.monthly_rent_cents / 100).toFixed(2)} €/mo
                  </p>
                )}
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
}: {
  locale: Locale;
  properties: PropertyRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              Label
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              Address
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">
              City
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">
              Rent
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {properties.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                <Link
                  href={`/${locale}/dashboard/properties/${p.id}`}
                  className="hover:text-brand-700 hover:underline"
                >
                  {p.label ?? "—"}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {p.address}
                {p.postal_code ? `, ${p.postal_code}` : ""}
              </td>
              <td className="px-4 py-3 text-slate-700">{p.city}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-700">
                {p.monthly_rent_cents != null
                  ? `${(p.monthly_rent_cents / 100).toFixed(2)} €`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
