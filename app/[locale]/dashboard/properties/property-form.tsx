"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SignedPhoto } from "@/lib/properties/photos";
import { PhotoManager, type PhotoManagerHandle } from "./photo-manager";
import {
  createPropertyAction,
  updatePropertyAction,
  type PropertyState,
} from "./actions";

export type PropertyTypeValue =
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

const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;

// Year range covers the typical span of DPE issuance (current year back ~15
// years). Computed lazily in the component so the list is recent on render.
function buildYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 15; y--) years.push(y);
  return years;
}

type Property = {
  id: string;
  owner_id?: string;
  label: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  country: string | null;
  monthly_rent_cents: number | null;
  value_cents: number | null;
  sell_price_cents: number | null;
  description: string | null;
  type: PropertyTypeValue | null;
  commercial_activity: string | null;
  commercial_equipment: string | null;
  surface_sqm: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  building: string | null;
  construction_year: number | null;
  housing_kind: "collective" | "individual" | null;
  ownership_kind: "single_ownership" | "co_ownership" | null;
  heating_mode: "individual" | "collective" | null;
  hot_water_mode: "individual" | "collective" | null;
  parking: boolean | null;
  basement: boolean | null;
  to_rent: boolean | null;
  to_sell: boolean | null;
  acquisition_date: string | null;
  acquisition_fees_cents: number | null;
  brokerage_fees_cents: number | null;
  housing_tax_cents: number | null;
  property_tax_cents: number | null;
  dpe_class: "A" | "B" | "C" | "D" | "E" | "F" | "G" | null;
  dpe_energy_consumption: number | null;
  dpe_ghg_emissions: number | null;
  annual_energy_cost_min_cents: number | null;
  annual_energy_cost_max_cents: number | null;
  annual_energy_cost_year: number | null;
  elevator: boolean | null;
  disabled_access: boolean | null;
  concierge: boolean | null;
  bike_storage: boolean | null;
  fiber_optic: boolean | null;
  laundry_room: boolean | null;
  caretaker: boolean | null;
  digicode: boolean | null;
  intercom: boolean | null;
  reinforced_door: boolean | null;
  cctv: boolean | null;
  ev_charger: boolean | null;
  double_glazing: boolean | null;
  cable_tv: boolean | null;
  rolling_shutters: boolean | null;
  rolling_shutters_electric: boolean | null;
  air_conditioning: boolean | null;
  smoke_detector: boolean | null;
  balcony: boolean | null;
  terrace: boolean | null;
  garden: boolean | null;
  gym: boolean | null;
  playground: boolean | null;
  green_space: boolean | null;
};

type AmenityKey =
  | "elevator"
  | "disabled_access"
  | "concierge"
  | "bike_storage"
  | "fiber_optic"
  | "laundry_room"
  | "caretaker"
  | "digicode"
  | "intercom"
  | "reinforced_door"
  | "cctv"
  | "ev_charger"
  | "double_glazing"
  | "cable_tv"
  | "air_conditioning"
  | "smoke_detector"
  | "balcony"
  | "terrace"
  | "garden"
  | "gym"
  | "playground"
  | "green_space";

// Order matches the user-facing list; rolling shutters is rendered separately
// because of its conditional sub-checkbox.
const AMENITIES: { key: AmenityKey; dictKey: keyof Dictionary["properties"]["fields"]["amenities"] }[] = [
  { key: "elevator", dictKey: "elevator" },
  { key: "disabled_access", dictKey: "disabledAccess" },
  { key: "concierge", dictKey: "concierge" },
  { key: "bike_storage", dictKey: "bikeStorage" },
  { key: "fiber_optic", dictKey: "fiberOptic" },
  { key: "laundry_room", dictKey: "laundryRoom" },
  { key: "caretaker", dictKey: "caretaker" },
  { key: "digicode", dictKey: "digicode" },
  { key: "intercom", dictKey: "intercom" },
  { key: "reinforced_door", dictKey: "reinforcedDoor" },
  { key: "cctv", dictKey: "cctv" },
  { key: "ev_charger", dictKey: "evCharger" },
  { key: "double_glazing", dictKey: "doubleGlazing" },
  { key: "cable_tv", dictKey: "cableTv" },
  // rolling_shutters rendered separately
  { key: "air_conditioning", dictKey: "airConditioning" },
  { key: "smoke_detector", dictKey: "smokeDetector" },
  { key: "balcony", dictKey: "balcony" },
  { key: "terrace", dictKey: "terrace" },
  { key: "garden", dictKey: "garden" },
  { key: "gym", dictKey: "gym" },
  { key: "playground", dictKey: "playground" },
  { key: "green_space", dictKey: "greenSpace" },
];

export type OwnerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function SubmitButton({ labels }: { labels: { idle: string; busy: string } }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? labels.busy : labels.idle}
    </button>
  );
}

export function PropertyForm({
  locale,
  dict,
  property,
  owners,
  existingPhotos = [],
}: {
  locale: Locale;
  dict: Dictionary["properties"];
  property?: Property;
  owners?: OwnerOption[];
  existingPhotos?: SignedPhoto[];
}) {
  const action = property ? updatePropertyAction : createPropertyAction;
  const [state, formAction] = useActionState<PropertyState, FormData>(action, {});
  const showOwnerSelect = Boolean(owners && owners.length > 0);
  const photoHandle = useRef<PhotoManagerHandle | null>(null);
  const [hasRollingShutters, setHasRollingShutters] = useState<boolean>(
    property?.rolling_shutters ?? false,
  );
  const [type, setType] = useState<string>(property?.type ?? "");

  const centsToEuros = (cents: number | null) =>
    cents != null ? (cents / 100).toFixed(2) : "";

  // Intercept submit so we can pull photo state out of the PhotoManager and
  // inject it into the FormData. Native file inputs can't accumulate picks
  // across multiple "Add photos" clicks, so the component owns the file list.
  const onSubmit = (fd: FormData) => {
    fd.delete("keep_paths");
    fd.delete("photos");
    const handle = photoHandle.current;
    if (handle) {
      handle.getKeptPaths().forEach((p) => fd.append("keep_paths", p));
      handle.getNewFiles().forEach((f) => fd.append("photos", f));
    }
    formAction(fd);
  };

  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {property && <input type="hidden" name="id" value={property.id} />}

      {/* Identity & location */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showOwnerSelect && (
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.owner} <span className="text-red-500">*</span>
            </label>
            <select
              name="owner_id"
              required
              defaultValue={property?.owner_id ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="" disabled>
                —
              </option>
              {owners!.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.full_name ?? o.email ?? o.id}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.label}
          </label>
          <input
            name="label"
            type="text"
            defaultValue={property?.label ?? ""}
            placeholder={dict.fields.labelPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.type}
          </label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">{dict.fields.typePlaceholder}</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {dict.types[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.address} <span className="text-red-500">*</span>
          </label>
          <input
            name="address"
            type="text"
            required
            defaultValue={property?.address ?? ""}
            placeholder={dict.fields.addressPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.city} <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            type="text"
            required
            defaultValue={property?.city ?? ""}
            placeholder={dict.fields.cityPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.postalCode}
          </label>
          <input
            name="postal_code"
            type="text"
            defaultValue={property?.postal_code ?? ""}
            placeholder={dict.fields.postalCodePlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.country}
          </label>
          <input
            name="country"
            type="text"
            defaultValue={property?.country ?? "FR"}
            placeholder={dict.fields.countryPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.monthlyRent}
          </label>
          <input
            name="monthly_rent_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centsToEuros(property?.monthly_rent_cents ?? null)}
            placeholder={dict.fields.monthlyRentPlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.value}
          </label>
          <input
            name="value_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centsToEuros(property?.value_cents ?? null)}
            placeholder={dict.fields.valuePlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {dict.fields.sellPrice}
          </label>
          <input
            name="sell_price_cents"
            type="number"
            min="0"
            step="0.01"
            defaultValue={centsToEuros(property?.sell_price_cents ?? null)}
            placeholder={dict.fields.valuePlaceholder}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            {dict.fields.sellPriceHint}
          </p>
        </div>
      </div>

      {/* Listing status */}
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.sections.status}
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="to_rent"
              defaultChecked={property?.to_rent ?? true}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {dict.fields.toRent}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="to_sell"
              defaultChecked={property?.to_sell ?? false}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {dict.fields.toSell}
          </label>
        </div>
      </fieldset>

      {/* Financial information */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.sections.financials}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.acquisitionDate}
            </label>
            <input
              name="acquisition_date"
              type="date"
              defaultValue={property?.acquisition_date ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.acquisitionFees}
            </label>
            <input
              name="acquisition_fees_cents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={centsToEuros(property?.acquisition_fees_cents ?? null)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.brokerageFees}
            </label>
            <input
              name="brokerage_fees_cents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={centsToEuros(property?.brokerage_fees_cents ?? null)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.housingTax}
            </label>
            <input
              name="housing_tax_cents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={centsToEuros(property?.housing_tax_cents ?? null)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.propertyTax}
            </label>
            <input
              name="property_tax_cents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={centsToEuros(property?.property_tax_cents ?? null)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Characteristics */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.sections.characteristics}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.surface}
            </label>
            <input
              name="surface_sqm"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.surface_sqm ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.rooms}
            </label>
            <input
              name="rooms"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.rooms ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.bedrooms}
            </label>
            <input
              name="bedrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.bedrooms ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.bathrooms}
            </label>
            <input
              name="bathrooms"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.bathrooms ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.floor}
            </label>
            <input
              name="floor"
              type="number"
              step="1"
              defaultValue={property?.floor ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.building}
            </label>
            <input
              name="building"
              type="text"
              defaultValue={property?.building ?? ""}
              placeholder={dict.fields.buildingPlaceholder}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.constructionYear}
            </label>
            <input
              name="construction_year"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.construction_year ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.housingKind}
            </label>
            <select
              name="housing_kind"
              defaultValue={property?.housing_kind ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">{dict.fields.anyChoice}</option>
              <option value="collective">{dict.fields.housingKindCollective}</option>
              <option value="individual">{dict.fields.housingKindIndividual}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.ownershipKind}
            </label>
            <select
              name="ownership_kind"
              defaultValue={property?.ownership_kind ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">{dict.fields.anyChoice}</option>
              <option value="single_ownership">{dict.fields.ownershipKindSingle}</option>
              <option value="co_ownership">{dict.fields.ownershipKindCo}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.heatingMode}
            </label>
            <select
              name="heating_mode"
              defaultValue={property?.heating_mode ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">{dict.fields.anyChoice}</option>
              <option value="individual">{dict.fields.modeIndividual}</option>
              <option value="collective">{dict.fields.modeCollective}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.hotWaterMode}
            </label>
            <select
              name="hot_water_mode"
              defaultValue={property?.hot_water_mode ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">{dict.fields.anyChoice}</option>
              <option value="individual">{dict.fields.modeIndividual}</option>
              <option value="collective">{dict.fields.modeCollective}</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="parking"
              defaultChecked={property?.parking ?? false}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {dict.fields.parking}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="basement"
              defaultChecked={property?.basement ?? false}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {dict.fields.basement}
          </label>
        </div>
      </fieldset>

      {/* Commercial lease details — only relevant for commercial premises */}
      {type === "commercial" && (
        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {dict.sections.commercial}
          </legend>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.commercialActivity}
            </label>
            <input
              name="commercial_activity"
              type="text"
              defaultValue={property?.commercial_activity ?? ""}
              placeholder={dict.fields.commercialActivityPlaceholder}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.commercialEquipment}
            </label>
            <textarea
              name="commercial_equipment"
              rows={3}
              defaultValue={property?.commercial_equipment ?? ""}
              placeholder={dict.fields.commercialEquipmentPlaceholder}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </fieldset>
      )}

      {/* Energy diagnostic (DPE) */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.sections.dpe}
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.dpeClass}
            </label>
            <select
              name="dpe_class"
              defaultValue={property?.dpe_class ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">{dict.fields.dpeClassPlaceholder}</option>
              {DPE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.dpeEnergyConsumption}
            </label>
            <input
              name="dpe_energy_consumption"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.dpe_energy_consumption ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {dict.fields.dpeGhgEmissions}
            </label>
            <input
              name="dpe_ghg_emissions"
              type="number"
              min="0"
              step="1"
              defaultValue={property?.dpe_ghg_emissions ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            {dict.fields.annualEnergyCost}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-600">
                {dict.fields.annualEnergyCostMin}
              </label>
              <input
                name="annual_energy_cost_min_cents"
                type="number"
                min="0"
                step="0.01"
                defaultValue={centsToEuros(
                  property?.annual_energy_cost_min_cents ?? null,
                )}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">
                {dict.fields.annualEnergyCostMax}
              </label>
              <input
                name="annual_energy_cost_max_cents"
                type="number"
                min="0"
                step="0.01"
                defaultValue={centsToEuros(
                  property?.annual_energy_cost_max_cents ?? null,
                )}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">
                {dict.fields.annualEnergyCostYear}
              </label>
              <select
                name="annual_energy_cost_year"
                defaultValue={property?.annual_energy_cost_year ?? ""}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">
                  {dict.fields.annualEnergyCostYearPlaceholder}
                </option>
                {buildYearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Amenities */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {dict.sections.amenities}
        </legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {AMENITIES.slice(0, 14).map(({ key, dictKey }) => (
            <label
              key={key}
              className="inline-flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name={key}
                defaultChecked={property?.[key] ?? false}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {dict.fields.amenities[dictKey]}
            </label>
          ))}
          <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="rolling_shutters"
                checked={hasRollingShutters}
                onChange={(e) => setHasRollingShutters(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {dict.fields.amenities.rollingShutters}
            </label>
            {hasRollingShutters && (
              <label className="inline-flex items-center gap-2 pl-6 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="rolling_shutters_electric"
                  defaultChecked={property?.rolling_shutters_electric ?? false}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {dict.fields.amenities.rollingShuttersElectric}
              </label>
            )}
          </div>
          {AMENITIES.slice(14).map(({ key, dictKey }) => (
            <label
              key={key}
              className="inline-flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name={key}
                defaultChecked={property?.[key] ?? false}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {dict.fields.amenities[dictKey]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {dict.fields.description}
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={property?.description ?? ""}
          placeholder={dict.fields.descriptionPlaceholder}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <PhotoManager
        dict={dict.photos}
        existing={existingPhotos}
        registerHandle={(h) => {
          photoHandle.current = h;
        }}
      />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "plan_limit" ? (
            <p className="font-medium">{dict.form.planLimit}</p>
          ) : state.error === "storage_limit" ? (
            <p className="font-medium">{dict.form.storageLimit}</p>
          ) : (
            <>
              <p className="font-medium">{dict.form.errorGeneric}</p>
              <p className="mt-1 text-xs text-red-600">{state.error}</p>
            </>
          )}
        </div>
      )}

      <SubmitButton labels={{ idle: dict.form.submit, busy: dict.form.submitting }} />
    </form>
  );
}
