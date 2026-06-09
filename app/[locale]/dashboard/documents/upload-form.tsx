"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  uploadDocumentAction,
  type DocumentState,
} from "./actions";

type PropertyOption = {
  id: string;
  label: string;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const selectClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700";

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

export function UploadDocumentForm({
  locale,
  dict,
  properties,
}: {
  locale: Locale;
  dict: Dictionary["documents"];
  properties: PropertyOption[];
}) {
  const [state, formAction] = useActionState<DocumentState, FormData>(
    uploadDocumentAction,
    {},
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setPickedName(f ? f.name : null);
  };

  if (properties.length === 0) {
    return (
      <p className="text-sm text-slate-600">{dict.upload.noProperties}</p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <label className={labelClass}>
          {dict.upload.property} <span className="text-red-500">*</span>
        </label>
        <select
          name="property_id"
          required
          defaultValue=""
          className={selectClass}
        >
          <option value="" disabled>
            {dict.upload.propertyPlaceholder}
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{dict.upload.name}</label>
        <input
          name="name"
          type="text"
          placeholder={dict.upload.namePlaceholder}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {dict.upload.pickFile}
        </button>
        <input
          ref={fileRef}
          type="file"
          name="file"
          required
          onChange={onFile}
          className="hidden"
        />
        {pickedName && (
          <span className="text-sm text-slate-600">{pickedName}</span>
        )}
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "file_too_large"
            ? dict.upload.fileTooLarge
            : state.error === "property_required"
              ? dict.upload.propertyRequired
              : state.error === "file_required"
                ? dict.upload.fileRequired
                : state.error === "storage_limit"
                  ? dict.upload.storageLimit
                  : dict.upload.errorGeneric}
        </div>
      )}

      <SubmitButton
        labels={{ idle: dict.upload.submit, busy: dict.upload.submitting }}
      />
    </form>
  );
}