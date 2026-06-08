"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  createTransactionAction,
  type TransactionState,
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

function errorMessage(
  code: string,
  dict: Dictionary["finance"]["transactions"],
): string {
  switch (code) {
    case "property_required":
    case "property_not_found":
      return dict.errors.property;
    case "amount_required":
      return dict.errors.amount;
    case "date_required":
      return dict.errors.date;
    case "kind_required":
      return dict.errors.kind;
    default:
      return dict.errors.generic;
  }
}

function TransactionForm({
  locale,
  dict,
  properties,
  today,
  onSuccess,
}: {
  locale: Locale;
  dict: Dictionary["finance"]["transactions"];
  properties: PropertyOption[];
  today: string;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState<TransactionState, FormData>(
    createTransactionAction,
    {},
  );
  const [kind, setKind] = useState<"income" | "expense">("income");

  useEffect(() => {
    if (state.ok) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid grid-cols-2 gap-2">
        {(["income", "expense"] as const).map((k) => (
          <label
            key={k}
            className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium ${
              kind === k
                ? k === "income"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-red-500 bg-red-50 text-red-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
              className="sr-only"
            />
            {dict.kind[k]}
          </label>
        ))}
      </div>

      <div>
        <label className={labelClass}>
          {dict.fields.property} <span className="text-red-500">*</span>
        </label>
        <select name="property_id" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            {dict.fields.propertyPlaceholder}
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            {dict.fields.amount} <span className="text-red-500">*</span>
          </label>
          <input
            name="amount_cents"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder={dict.fields.amountPlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {dict.fields.date} <span className="text-red-500">*</span>
          </label>
          <input
            name="occurred_on"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>{dict.fields.category}</label>
        <select
          // Remount on kind change so the value resets to the placeholder
          // (income and expense have disjoint category lists).
          key={kind}
          name="category"
          defaultValue=""
          className={selectClass}
        >
          <option value="">{dict.fields.categoryPlaceholder}</option>
          {Object.entries(
            kind === "income" ? dict.incomeCategories : dict.expenseCategories,
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{dict.fields.note}</label>
        <input
          name="note"
          type="text"
          placeholder={dict.fields.notePlaceholder}
          className={inputClass}
        />
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(state.error, dict)}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <SubmitButton
          labels={{ idle: dict.submit, busy: dict.submitting }}
        />
      </div>
    </form>
  );
}

export function AddTransactionModal({
  locale,
  dict,
  properties,
  today,
}: {
  locale: Locale;
  dict: Dictionary["finance"]["transactions"];
  properties: PropertyOption[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  // Bumped on each open so the inner form (and its action state) remounts fresh.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);

  const openModal = () => {
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const disabled = properties.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={disabled}
        title={disabled ? dict.noProperties : undefined}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden className="text-base leading-none">
          +
        </span>
        {dict.addButton}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={dict.modalTitle}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-base font-semibold text-slate-900">
                {dict.modalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={dict.close}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <span aria-hidden className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
            <div className="px-5 py-4">
              <TransactionForm
                key={formKey}
                locale={locale}
                dict={dict}
                properties={properties}
                today={today}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
