"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SignedTenantDocument } from "@/lib/tenants/documents";
import {
  createTenantAction,
  updateTenantAction,
  type TenantState,
} from "./actions";

type TenantTypeValue = "particulier" | "societe";
type CiviliteValue = "mr" | "mrs";
type IdDocTypeValue =
  | "id_card"
  | "passport"
  | "driver_license"
  | "residence_permit";

const ID_DOC_TYPES: IdDocTypeValue[] = [
  "id_card",
  "passport",
  "driver_license",
  "residence_permit",
];

type Tenant = {
  id: string;
  owner_id?: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tenant_type: TenantTypeValue | null;
  civilite: CiviliteValue | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  nationality: string | null;
  profession: string | null;
  income_cents: number | null;
  previous_address: string | null;
  previous_city: string | null;
  previous_postal_code: string | null;
  previous_country: string | null;
  id_document_type: IdDocTypeValue | null;
  id_document_number: string | null;
  id_document_expiration: string | null;
  id_document_path: string | null;
  id_document_name: string | null;
  siren: string | null;
  vat_number: string | null;
  capital_cents: number | null;
  business_sector: string | null;
  legal_rep_first_name: string | null;
  legal_rep_last_name: string | null;
};

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

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const selectClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

export function TenantForm({
  locale,
  dict,
  tenant,
  owners,
  existingDocument,
}: {
  locale: Locale;
  dict: Dictionary["tenants"];
  tenant?: Tenant;
  owners?: OwnerOption[];
  existingDocument?: SignedTenantDocument | null;
}) {
  const action = tenant ? updateTenantAction : createTenantAction;
  const [state, formAction] = useActionState<TenantState, FormData>(action, {});
  const showOwnerSelect = Boolean(owners && owners.length > 0);

  const [tenantType, setTenantType] = useState<TenantTypeValue | "">(
    tenant?.tenant_type ?? "particulier",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);

  const centsToEuros = (cents: number | null) =>
    cents != null ? (cents / 100).toFixed(2) : "";

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setPickedFileName(f ? f.name : null);
  };

  const showParticulier = tenantType === "particulier";
  const showSociete = tenantType === "societe";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {tenant && <input type="hidden" name="id" value={tenant.id} />}

      {/* Identity — owner, type, name + contact across the full width */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showOwnerSelect && (
          <div>
            <label className={labelClass}>
              {dict.fields.owner} <span className="text-red-500">*</span>
            </label>
            <select
              name="owner_id"
              required
              defaultValue={tenant?.owner_id ?? ""}
              className={selectClass}
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

        <div className={showOwnerSelect ? "" : "sm:col-span-2 lg:col-span-1"}>
          <label className={labelClass}>{dict.fields.tenantType}</label>
          <div className="mt-2 flex h-[38px] items-center gap-4 text-sm text-slate-700">
            {(["particulier", "societe"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tenant_type"
                  value={t}
                  checked={tenantType === t}
                  onChange={() => setTenantType(t)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                {t === "particulier"
                  ? dict.fields.tenantTypeParticulier
                  : dict.fields.tenantTypeSociete}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>{dict.fields.email}</label>
          <input
            name="email"
            type="email"
            defaultValue={tenant?.email ?? ""}
            placeholder={dict.fields.emailPlaceholder}
            className={inputClass}
          />
          {!tenant && (
            <p className="mt-1 text-xs text-slate-500">
              {dict.fields.emailHint}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>{dict.fields.phone}</label>
          <input
            name="phone"
            type="tel"
            defaultValue={tenant?.phone ?? ""}
            placeholder={dict.fields.phonePlaceholder}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          {showSociete ? dict.fields.companyName : dict.fields.fullName}{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          name="full_name"
          type="text"
          required
          defaultValue={tenant?.full_name ?? ""}
          placeholder={dict.fields.fullNamePlaceholder}
          className={inputClass}
        />
      </div>

      {showParticulier && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Personal information */}
          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dict.sections.personalInformation}
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{dict.fields.civilite}</label>
                <select
                  name="civilite"
                  defaultValue={tenant?.civilite ?? ""}
                  className={selectClass}
                >
                  <option value="">{dict.fields.civilitePlaceholder}</option>
                  <option value="mr">{dict.fields.civiliteMr}</option>
                  <option value="mrs">{dict.fields.civiliteMrs}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{dict.fields.dateOfBirth}</label>
                <input
                  name="date_of_birth"
                  type="date"
                  defaultValue={tenant?.date_of_birth ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.placeOfBirth}</label>
                <input
                  name="place_of_birth"
                  type="text"
                  defaultValue={tenant?.place_of_birth ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{dict.fields.nationality}</label>
                <input
                  name="nationality"
                  type="text"
                  defaultValue={tenant?.nationality ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.profession}</label>
                <input
                  name="profession"
                  type="text"
                  defaultValue={tenant?.profession ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.income}</label>
                <input
                  name="income_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={centsToEuros(tenant?.income_cents ?? null)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          {/* Previous address */}
          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dict.sections.previousAddress}
            </legend>
            <div>
              <label className={labelClass}>{dict.fields.previousAddress}</label>
              <input
                name="previous_address"
                type="text"
                defaultValue={tenant?.previous_address ?? ""}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{dict.fields.previousCity}</label>
                <input
                  name="previous_city"
                  type="text"
                  defaultValue={tenant?.previous_city ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {dict.fields.previousPostalCode}
                </label>
                <input
                  name="previous_postal_code"
                  type="text"
                  defaultValue={tenant?.previous_postal_code ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {dict.fields.previousCountry}
                </label>
                <input
                  name="previous_country"
                  type="text"
                  defaultValue={tenant?.previous_country ?? "FR"}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {showSociete && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Company information */}
          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dict.sections.companyInformation}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{dict.fields.siren}</label>
                <input
                  name="siren"
                  type="text"
                  defaultValue={tenant?.siren ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.vatNumber}</label>
                <input
                  name="vat_number"
                  type="text"
                  defaultValue={tenant?.vat_number ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{dict.fields.capital}</label>
                <input
                  name="capital_cents"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={centsToEuros(tenant?.capital_cents ?? null)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {dict.fields.businessSector}
                </label>
                <input
                  name="business_sector"
                  type="text"
                  defaultValue={tenant?.business_sector ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          {/* Legal representative */}
          <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dict.sections.legalRepresentative}
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{dict.fields.lastName}</label>
                <input
                  name="legal_rep_last_name"
                  type="text"
                  defaultValue={tenant?.legal_rep_last_name ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.firstName}</label>
                <input
                  name="legal_rep_first_name"
                  type="text"
                  defaultValue={tenant?.legal_rep_first_name ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.civilite}</label>
                <select
                  name="civilite"
                  defaultValue={tenant?.civilite ?? ""}
                  className={selectClass}
                >
                  <option value="">{dict.fields.civilitePlaceholder}</option>
                  <option value="mr">{dict.fields.civiliteMr}</option>
                  <option value="mrs">{dict.fields.civiliteMrs}</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{dict.fields.dateOfBirth}</label>
                <input
                  name="date_of_birth"
                  type="date"
                  defaultValue={tenant?.date_of_birth ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.placeOfBirth}</label>
                <input
                  name="place_of_birth"
                  type="text"
                  defaultValue={tenant?.place_of_birth ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{dict.fields.nationality}</label>
                <input
                  name="nationality"
                  type="text"
                  defaultValue={tenant?.nationality ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {(showParticulier || showSociete) && (
        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {dict.sections.idDocument}
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{dict.fields.idDocumentType}</label>
              <select
                name="id_document_type"
                defaultValue={tenant?.id_document_type ?? ""}
                className={selectClass}
              >
                <option value="">
                  {dict.fields.idDocumentTypePlaceholder}
                </option>
                {ID_DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {dict.fields.idDocumentTypes[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {dict.fields.idDocumentNumber}
              </label>
              <input
                name="id_document_number"
                type="text"
                defaultValue={tenant?.id_document_number ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {dict.fields.idDocumentExpiration}
              </label>
              <input
                name="id_document_expiration"
                type="date"
                defaultValue={tenant?.id_document_expiration ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {dict.fields.attachIdDocument}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              name="id_document_file"
              onChange={handleFilePick}
              className="hidden"
            />
            {pickedFileName && (
              <span className="text-sm text-slate-600">{pickedFileName}</span>
            )}
            {!pickedFileName && existingDocument?.signedUrl && (
              <a
                href={existingDocument.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-600 hover:underline"
              >
                {dict.fields.currentDocument}: {existingDocument.name}
              </a>
            )}
            {!pickedFileName &&
              existingDocument &&
              !existingDocument.signedUrl && (
                <span className="text-sm text-slate-600">
                  {dict.fields.currentDocument}: {existingDocument.name}
                </span>
              )}
          </div>
        </fieldset>
      )}

      <div>
        <label className={labelClass}>{dict.fields.notes}</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={tenant?.notes ?? ""}
          placeholder={dict.fields.notesPlaceholder}
          className={inputClass}
        />
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">{dict.form.errorGeneric}</p>
          <p className="mt-1 text-xs text-red-600">{state.error}</p>
        </div>
      )}

      <SubmitButton labels={{ idle: dict.form.submit, busy: dict.form.submitting }} />
    </form>
  );
}
