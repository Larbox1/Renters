import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SetupNotice } from "@/components/setup-notice";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentSession, isOwnerOrAdmin } from "@/lib/auth/current-user";
import { ConfirmSubmit } from "@/components/confirm-submit";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { signPhotos, type PropertyPhoto } from "@/lib/properties/photos";
import { deletePropertyAction } from "../actions";

type DpeClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

const DPE_BADGE: Record<DpeClass, string> = {
  A: "bg-green-700 text-white",
  B: "bg-green-500 text-white",
  C: "bg-lime-400 text-slate-900",
  D: "bg-yellow-400 text-slate-900",
  E: "bg-orange-400 text-white",
  F: "bg-red-500 text-white",
  G: "bg-red-700 text-white",
};

type AmenityDictKey = keyof Dictionary["properties"]["fields"]["amenities"];
type AmenityRow = { col: string; dictKey: AmenityDictKey };

const AMENITY_LIST: AmenityRow[] = [
  { col: "elevator", dictKey: "elevator" },
  { col: "disabled_access", dictKey: "disabledAccess" },
  { col: "concierge", dictKey: "concierge" },
  { col: "bike_storage", dictKey: "bikeStorage" },
  { col: "fiber_optic", dictKey: "fiberOptic" },
  { col: "laundry_room", dictKey: "laundryRoom" },
  { col: "caretaker", dictKey: "caretaker" },
  { col: "digicode", dictKey: "digicode" },
  { col: "intercom", dictKey: "intercom" },
  { col: "reinforced_door", dictKey: "reinforcedDoor" },
  { col: "cctv", dictKey: "cctv" },
  { col: "ev_charger", dictKey: "evCharger" },
  { col: "double_glazing", dictKey: "doubleGlazing" },
  { col: "cable_tv", dictKey: "cableTv" },
  { col: "air_conditioning", dictKey: "airConditioning" },
  { col: "smoke_detector", dictKey: "smokeDetector" },
  { col: "balcony", dictKey: "balcony" },
  { col: "terrace", dictKey: "terrace" },
  { col: "garden", dictKey: "garden" },
  { col: "gym", dictKey: "gym" },
  { col: "playground", dictKey: "playground" },
  { col: "green_space", dictKey: "greenSpace" },
];

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const propDict = dict.properties;

  if (!hasSupabaseEnv()) return <SetupNotice locale={locale as Locale} />;

  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isOwnerOrAdmin(session.role)) {
    return <AccessDenied dict={dict.accessDenied} />;
  }
  const { supabase } = session;

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "id, status, start_date, end_date, monthly_rent_cents, tenant_id, tenants(full_name)",
    )
    .eq("property_id", id)
    .order("start_date", { ascending: false });

  const photos = await signPhotos(
    (property.photos ?? []) as PropertyPhoto[],
  );

  const fmtCurrency = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(iso));

  const formatFloor = (n: number) => {
    if (n === 0) return locale === "fr" ? "RDC" : "Ground floor";
    if (n < 0) return `${n}`;
    return `${n}`;
  };

  // Active amenities (filtered to those flagged true), with rolling shutters
  // injected at its original position so the on/off layout stays consistent.
  const activeAmenities: { label: string }[] = [];
  for (const a of AMENITY_LIST) {
    if (property[a.col]) {
      activeAmenities.push({ label: propDict.fields.amenities[a.dictKey] });
    }
    // Rolling shutters sits between cable_tv and air_conditioning in the form.
    if (a.col === "cable_tv" && property.rolling_shutters) {
      const base = propDict.fields.amenities.rollingShutters;
      const electric = property.rolling_shutters_electric
        ? ` (${propDict.fields.amenities.rollingShuttersElectric.toLowerCase()})`
        : "";
      activeAmenities.push({ label: `${base}${electric}` });
    }
  }

  const hasCharacteristics =
    property.type ||
    property.surface_sqm != null ||
    property.rooms != null ||
    property.bedrooms != null ||
    property.bathrooms != null ||
    property.floor != null ||
    property.building ||
    property.construction_year != null ||
    property.parking ||
    property.basement;

  const hasDpe =
    property.dpe_class ||
    property.dpe_energy_consumption != null ||
    property.dpe_ghg_emissions != null ||
    property.annual_energy_cost_min_cents != null ||
    property.annual_energy_cost_max_cents != null ||
    property.annual_energy_cost_year != null;

  const hasFinancials =
    property.monthly_rent_cents != null ||
    property.value_cents != null ||
    property.sell_price_cents != null ||
    property.acquisition_date ||
    property.acquisition_fees_cents != null ||
    property.brokerage_fees_cents != null ||
    property.housing_tax_cents != null ||
    property.property_tax_cents != null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${locale}/dashboard/properties`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← {propDict.backToList}
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {property.label ?? `${property.address}, ${property.city}`}
              </h1>
              {property.to_rent && (
                <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  {propDict.fields.forRentBadge}
                </span>
              )}
              {property.to_sell && (
                <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  {propDict.fields.forSaleBadge}
                </span>
              )}
              {property.type && (
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {propDict.types[
                    property.type as keyof typeof propDict.types
                  ] ?? property.type}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {property.address}
              {property.building ? `, ${propDict.fields.building} ${property.building}` : ""}
              {property.floor != null
                ? `, ${propDict.fields.floor.toLowerCase()} ${formatFloor(property.floor)}`
                : ""}
              {", "}
              {property.city}
              {property.postal_code ? ` ${property.postal_code}` : ""}
              {property.country ? `, ${property.country}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/${locale}/dashboard/properties/${id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {propDict.editProperty}
            </Link>
            <form action={deletePropertyAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit
                message={propDict.confirmDelete}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                {propDict.deleteProperty}
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </div>

      {/* Quick figures */}
      {(property.surface_sqm != null ||
        property.rooms != null ||
        property.bedrooms != null ||
        property.dpe_class) && (
        <div className="mb-6 grid gap-4 grid-cols-2 sm:grid-cols-4">
          {property.surface_sqm != null && (
            <KeyStat label={propDict.fields.surface} value={`${property.surface_sqm} m²`} />
          )}
          {property.rooms != null && (
            <KeyStat label={propDict.fields.rooms} value={String(property.rooms)} />
          )}
          {property.bedrooms != null && (
            <KeyStat
              label={propDict.fields.bedrooms}
              value={String(property.bedrooms)}
            />
          )}
          {property.dpe_class && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {propDict.fields.dpeClass}
              </p>
              <span
                className={`mt-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-base font-bold ${
                  DPE_BADGE[property.dpe_class as DpeClass] ?? "bg-slate-200 text-slate-700"
                }`}
              >
                {property.dpe_class}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <Section title={propDict.photos.label}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p, i) =>
              p.signedUrl ? (
                <a
                  key={p.path}
                  href={p.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
                    i === 0 ? "sm:col-span-2 sm:row-span-2 lg:col-span-2" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.signedUrl}
                    alt={p.name}
                    className="h-full w-full object-cover aspect-[4/3]"
                  />
                </a>
              ) : null,
            )}
          </div>
        </Section>
      )}

      {/* Description */}
      {property.description && (
        <Section title={propDict.fields.description}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {property.description}
          </p>
        </Section>
      )}

      {/* Characteristics */}
      {hasCharacteristics && (
        <Section title={propDict.sections.characteristics}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            {property.type && (
              <DlRow
                label={propDict.fields.type}
                value={
                  propDict.types[
                    property.type as keyof typeof propDict.types
                  ] ?? property.type
                }
              />
            )}
            {property.surface_sqm != null && (
              <DlRow
                label={propDict.fields.surface}
                value={`${property.surface_sqm} m²`}
              />
            )}
            {property.rooms != null && (
              <DlRow
                label={propDict.fields.rooms}
                value={String(property.rooms)}
              />
            )}
            {property.bedrooms != null && (
              <DlRow
                label={propDict.fields.bedrooms}
                value={String(property.bedrooms)}
              />
            )}
            {property.bathrooms != null && (
              <DlRow
                label={propDict.fields.bathrooms}
                value={String(property.bathrooms)}
              />
            )}
            {property.floor != null && (
              <DlRow
                label={propDict.fields.floor}
                value={formatFloor(property.floor)}
              />
            )}
            {property.building && (
              <DlRow
                label={propDict.fields.building}
                value={property.building}
              />
            )}
            {property.construction_year != null && (
              <DlRow
                label={propDict.fields.constructionYear}
                value={String(property.construction_year)}
              />
            )}
            {property.parking && (
              <DlRow label={propDict.fields.parking} value="✓" emphasized />
            )}
            {property.basement && (
              <DlRow label={propDict.fields.basement} value="✓" emphasized />
            )}
          </dl>
        </Section>
      )}

      {/* Amenities */}
      {activeAmenities.length > 0 && (
        <Section title={propDict.sections.amenities}>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeAmenities.map((a) => (
              <li
                key={a.label}
                className="flex items-center gap-2 text-sm text-slate-800"
              >
                <span aria-hidden className="text-emerald-600">
                  ✓
                </span>
                {a.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Energy diagnostic */}
      {hasDpe && (
        <Section title={propDict.sections.dpe}>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            {property.dpe_class && (
              <div>
                <p className="text-xs text-slate-500">
                  {propDict.fields.dpeClass}
                </p>
                <span
                  className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-base font-bold ${
                    DPE_BADGE[property.dpe_class as DpeClass] ?? "bg-slate-200 text-slate-700"
                  }`}
                >
                  {property.dpe_class}
                </span>
              </div>
            )}
            {property.dpe_energy_consumption != null && (
              <DlRow
                label={propDict.fields.dpeEnergyConsumption}
                value={`${property.dpe_energy_consumption} kWh/m²`}
              />
            )}
            {property.dpe_ghg_emissions != null && (
              <DlRow
                label={propDict.fields.dpeGhgEmissions}
                value={`${property.dpe_ghg_emissions} kgCO₂/m²`}
              />
            )}
          </div>
          {(property.annual_energy_cost_min_cents != null ||
            property.annual_energy_cost_max_cents != null ||
            property.annual_energy_cost_year != null) && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                {propDict.fields.annualEnergyCost}
                {property.annual_energy_cost_year
                  ? ` · ${property.annual_energy_cost_year}`
                  : ""}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {property.annual_energy_cost_min_cents != null
                  ? fmtCurrency(property.annual_energy_cost_min_cents)
                  : "—"}
                {" – "}
                {property.annual_energy_cost_max_cents != null
                  ? fmtCurrency(property.annual_energy_cost_max_cents)
                  : "—"}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Financial information */}
      {hasFinancials && (
        <Section title={propDict.sections.financials}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            {property.monthly_rent_cents != null && (
              <DlRow
                label={propDict.fields.monthlyRent}
                value={fmtCurrency(property.monthly_rent_cents)}
              />
            )}
            {property.value_cents != null && (
              <DlRow
                label={propDict.fields.value}
                value={fmtCurrency(property.value_cents)}
              />
            )}
            {property.sell_price_cents != null && (
              <DlRow
                label={propDict.fields.sellPrice}
                value={fmtCurrency(property.sell_price_cents)}
                accent="amber"
              />
            )}
            {property.acquisition_date && (
              <DlRow
                label={propDict.fields.acquisitionDate}
                value={fmtDate(property.acquisition_date)}
              />
            )}
            {property.acquisition_fees_cents != null && (
              <DlRow
                label={propDict.fields.acquisitionFees}
                value={fmtCurrency(property.acquisition_fees_cents)}
              />
            )}
            {property.brokerage_fees_cents != null && (
              <DlRow
                label={propDict.fields.brokerageFees}
                value={fmtCurrency(property.brokerage_fees_cents)}
              />
            )}
            {property.housing_tax_cents != null && (
              <DlRow
                label={propDict.fields.housingTax}
                value={fmtCurrency(property.housing_tax_cents)}
              />
            )}
            {property.property_tax_cents != null && (
              <DlRow
                label={propDict.fields.propertyTax}
                value={fmtCurrency(property.property_tax_cents)}
              />
            )}
          </dl>
        </Section>
      )}

      {/* Leases */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {propDict.leasesOnProperty}
          </h2>
          <Link
            href={`/${locale}/dashboard/leases/new?property_id=${id}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            + {dict.leases.newLease}
          </Link>
        </div>

        {!leases || leases.length === 0 ? (
          <p className="text-sm text-slate-600">{propDict.noLeases}</p>
        ) : (
          <ul className="space-y-3">
            {leases.map((l) => {
              const tenantName = Array.isArray(l.tenants)
                ? l.tenants[0]?.full_name
                : (l.tenants as { full_name: string } | null)?.full_name;
              return (
                <li key={l.id}>
                  <Link
                    href={`/${locale}/dashboard/leases/${l.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300 hover:bg-brand-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{tenantName}</p>
                      <p className="text-sm text-slate-500">
                        {l.start_date}
                        {l.end_date ? ` → ${l.end_date}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                        {dict.leases.status[l.status as keyof typeof dict.leases.status]}
                      </span>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {fmtCurrency(l.monthly_rent_cents)}/mo
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DlRow({
  label,
  value,
  emphasized = false,
  accent,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  accent?: "amber";
}) {
  const valueClass =
    accent === "amber"
      ? "text-sm font-semibold text-amber-700"
      : emphasized
        ? "text-sm font-medium text-emerald-700"
        : "text-sm font-medium text-slate-900";
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}
